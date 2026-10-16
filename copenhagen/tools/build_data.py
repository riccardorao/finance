#!/usr/bin/env python3
"""Build data/cph-data.js for the rental evaluator from Copenhagen open data.

Sources
- Københavns Kommune WFS (https://wfs-kbhkort.kk.dk/k101/ows):
  * vejstoej_boliger_2022  road noise (Lden, dB) for every dwelling, with street and house number
  * lokaludvalgsgraense, kvarter  local-committee areas and quarters, combined into the 13 districts
                           used by the city's safety survey (Nørrebro split into Indre and Ydre)
  * station_oversigtskort  metro, S-train and other rail stations
  * park_groent_omr_oversigtskort  parks and green areas (Copenhagen and neighbours)
- Københavns Kommune, Tryghedsundersøgelse 2025 (survey by Epinion, crime data from Københavns Politi):
  https://www.kk.dk/sites/default/files/2025-06/Tryghedsunders%C3%B8gelsen%202025.pdf
  Values transcribed into SAFETY below (appendix summary table and figure U).
- OpenStreetMap (© OpenStreetMap contributors, ODbL):
  * Nominatim: Frederiksberg Kommune boundary
  * Overpass: Frederiksberg addresses (imported from Danmarks Adresseregister); no noise data exists for these

Usage: python3 tools/build_data.py [cache_dir]
Requires: shapely, pyproj
"""
import csv
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform, unary_union

WFS = 'https://wfs-kbhkort.kk.dk/k101/ows?service=WFS&version=1.0.0&request=GetFeature'
SOURCES = {
    'noise.csv': WFS + '&typeName=k101:vejstoej_boliger_2022&propertyName=vejnavn,husnummer,postnummer,x,y,lden&outputFormat=csv',
    'lokaludvalg.json': WFS + '&typeName=k101:lokaludvalgsgraense&outputFormat=json&SRSNAME=EPSG:4326',
    'kvarter.json': WFS + '&typeName=k101:kvarter&outputFormat=json&SRSNAME=EPSG:4326',
    'stations.json': WFS + '&typeName=k101:station_oversigtskort&outputFormat=json&SRSNAME=EPSG:4326',
    'parks.json': WFS + '&typeName=k101:park_groent_omr_oversigtskort&outputFormat=json&SRSNAME=EPSG:4326',
    'frb.json': 'https://nominatim.openstreetmap.org/search?q=Frederiksberg+Kommune&format=geojson&polygon_geojson=1&limit=1',
    'frb_addr.json': 'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=' + urllib.parse.quote(
        '[out:json][timeout:120];area["name"="Frederiksberg Kommune"]["admin_level"="7"]->.a;'
        '(node(area.a)["addr:street"]["addr:housenumber"];way(area.a)["addr:street"]["addr:housenumber"];);out center tags;'),
}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'cph-data.js')
# Tryghedsundersøgelse 2025: % feeling safe in their neighbourhood, % safe in the evening and at night,
# and reported criminal-code offences per 1,000 residents in 2024 (Københavns Politi).
SAFETY = {
    'Amager Vest':     (90, 85, 51),
    'Amager Øst':      (85, 77, 44),
    'Bispebjerg':      (80, 74, 49),
    'Brønshøj-Husum':  (81, 71, 45),
    'Christianshavn':  (89, 79, 82),
    'Indre By':        (91, 85, 253),
    'Indre Nørrebro':  (89, 82, 46),
    'Kongens Enghave': (92, 84, 46),
    'Valby':           (88, 81, 44),
    'Vanløse':         (89, 79, 42),
    'Vesterbro':       (90, 82, 129),
    'Ydre Nørrebro':   (86, 75, 52),
    'Østerbro':        (91, 83, 42),
}
SAFETY_CITY = (88, 80, 73)
# Nørrebro quarters on each side of Jagtvej, as the survey splits them
NORREBRO = {'Indre Nørrebro': [20401, 20402], 'Ydre Nørrebro': [20403, 20404, 20405]}
MIN_PARK_M2 = 10_000          # parks of at least 1 ha count as green space
E5 = 100_000                  # coordinates stored as integers in 1e-5 degrees (about 1 m)

to_wgs = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True).transform
to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True).transform


def fetch(cache):
    os.makedirs(cache, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(cache, name)
        if os.path.exists(path):
            continue
        print('downloading', name)
        req = urllib.request.Request(url, headers={'User-Agent': 'copenhagen-rental-evaluator/1.0'})
        with urllib.request.urlopen(req, timeout=600) as r, open(path, 'wb') as f:
            f.write(r.read())


def ring(coords, tol):
    return [[round(x * E5), round(y * E5)] for x, y in coords]


def poly_coords(geom, tol):
    """Simplified polygon rings as integer lon/lat pairs."""
    g = geom.simplify(tol, preserve_topology=True)
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return [[ring(p.exterior.coords, tol)] for p in polys if not p.is_empty]


def build(cache):
    # --- addresses with noise -------------------------------------------------
    acc = defaultdict(lambda: [0.0, 0.0, 0, -1.0])
    with open(os.path.join(cache, 'noise.csv'), newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if not r['vejnavn'] or not r['husnummer'] or not r['x']:
                continue
            k = (r['vejnavn'].strip(), r['husnummer'].strip())
            a = acc[k]
            a[0] += float(r['x']); a[1] += float(r['y']); a[2] += 1
            a[3] = max(a[3], float(r['lden'] or 0))   # most exposed dwelling at the address
    streets = defaultdict(list)
    for (street, hn), (sx, sy, n, lden) in acc.items():
        lon, lat = to_wgs(sx / n, sy / n)
        streets[street].append((hn, round(lat * E5), round(lon * E5), round(lden)))
    # Frederiksberg: separate municipality, not in the Copenhagen data; noise unknown (-1)
    for e in json.load(open(os.path.join(cache, 'frb_addr.json')))['elements']:
        t = e['tags']
        street, hn = t['addr:street'].strip(), t['addr:housenumber'].strip()
        if (street, hn) in acc:
            continue
        lat, lon = (e['lat'], e['lon']) if 'lat' in e else (e['center']['lat'], e['center']['lon'])
        acc[(street, hn)] = None
        streets[street].append((hn, round(lat * E5), round(lon * E5), -1))

    def hn_key(hn):
        digits = ''.join(c for c in hn if c.isdigit())
        return (int(digits) if digits else 0, hn)

    addr = {}
    for street in sorted(streets):
        rows = sorted(streets[street], key=lambda t: hn_key(t[0]))
        addr[street] = ';'.join(f'{hn},{lat},{lon},{db}' for hn, lat, lon, db in rows)

    # --- districts -------------------------------------------------------------
    districts = []
    kvarter = {f['properties']['kvarternr']: shape(f['geometry'])
               for f in json.load(open(os.path.join(cache, 'kvarter.json')))['features'] if f.get('geometry')}
    for f in json.load(open(os.path.join(cache, 'lokaludvalg.json')))['features']:
        name = f['properties']['navn']
        if name == 'Nørrebro':
            for part, ids in NORREBRO.items():
                districts.append({'name': part, 'rings': poly_coords(unary_union([kvarter[i] for i in ids]), 0.0004)})
        else:
            districts.append({'name': name, 'rings': poly_coords(shape(f['geometry']), 0.0004)})
    assert sorted(d['name'] for d in districts) == sorted(SAFETY), 'district names must match the safety survey'
    frb = json.load(open(os.path.join(cache, 'frb.json')))['features'][0]
    districts.append({'name': 'Frederiksberg', 'rings': poly_coords(shape(frb['geometry']), 0.0004)})
    districts.sort(key=lambda d: d['name'])

    # --- stations --------------------------------------------------------------
    stations = []
    for f in json.load(open(os.path.join(cache, 'stations.json')))['features']:
        p = f['properties']
        lon, lat = f['geometry']['coordinates'][0]
        stations.append([p['navn'], {'Metrostation': 'M', 'S-station': 'S'}.get(p['objekt_type'], 'T'), round(lat * E5), round(lon * E5)])

    # --- parks of at least 1 ha ----------------------------------------------------
    parks = []
    for f in json.load(open(os.path.join(cache, 'parks.json')))['features']:
        if not f.get('geometry'):
            continue
        g = shape(f['geometry'])
        if transform(to_utm, g).area < MIN_PARK_M2:
            continue
        parks.extend(poly_coords(g, 0.0002))

    data = {
        'meta': {
            'built': __import__('datetime').date.today().isoformat(),
            'addresses': sum(len(v) for v in streets.values()),
            'streets': len(addr),
        },
        'districts': districts,
        'safety': {k: {'tryg': v[0], 'aften': v[1], 'krim': v[2]} for k, v in SAFETY.items()},
        'safetyCity': {'tryg': SAFETY_CITY[0], 'aften': SAFETY_CITY[1], 'krim': SAFETY_CITY[2]},
        'stations': stations,
        'parks': parks,
        'addr': addr,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* Generated by tools/build_data.py from Københavns Kommune open data and OpenStreetMap. Do not edit. */\n')
        f.write('window.CPH_DATA=')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f"wrote {OUT}: {os.path.getsize(OUT) / 1e6:.2f} MB, {data['meta']['streets']} streets, "
          f"{data['meta']['addresses']} addresses, {len(stations)} stations, {len(parks)} park polygons")


if __name__ == '__main__':
    cache = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '.cache')
    fetch(cache)
    build(cache)
