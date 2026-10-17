# Il Dividendo di Firenze · modello micro-economico

Un unico file HTML interattivo (`dividendo-firenze-it.html`, si apre in qualsiasi browser, funziona offline)
che simula una riforma progressiva dell'imposta di soggiorno di Firenze e mostra come, al variare della
politica, cambiano nel tempo tutti i fattori coinvolti. Il pulsante **Salva scenario** esporta una presentazione
in PDF (16:9, vettoriale, stile consulenza strategica) con i risultati della politica impostata.

## La politica

Si definiscono soltanto le leve: pavimento, aliquota sul prezzo, tetto, imposta per i cittadini UE under 30,
contributo d'accesso per gli escursionisti e il Fondo Armonizzatore (commercio, imprese e talenti, garanzia
sugli affitti, riqualificazione dei lavoratori). Si sceglie poi in quanti anni (da 1 a 8) arrivare all'obiettivo
e, se si vuole, il valore di ogni leva anno per anno; per impostazione predefinita è una rampa lineare da oggi.
Le ipotesi non sono modificabili: sono ricavate dai dati, calibrate sul gettito osservato e documentate con
la fonte nella pagina **Ipotesi**.

| File | Contenuto |
|---|---|
| `dividendo-firenze-it.html` | La console del modello, in italiano (file autonomo, generato da `build.py`) |
| `white-paper-dividendo-firenze.pdf` | PDF esportato con la proposta di base |
| `src/` | Sorgenti: modello, strato di disegno, slide, interfaccia, caratteri e librerie |
| `tests/model.test.js` | Verifica numerica del modello da riga di comando |
| `dividendo-firenze.html` | Versione precedente in inglese (modello v2, non più aggiornata) |

## Il modello

Equilibrio parziale, annuale, per una sola città. Cinque tipologie di visitatore con prezzi log-normali,
elasticità crescente con il rincaro e traslazione parziale dell'imposta sull'ospite. Da lì il modello calcola:

1. gettito dell'imposta, quota allo Stato, evasione, contributo d'accesso per gli escursionisti;
2. surplus dei turisti, margini di albergatori e proprietari, ristorazione e commercio, perdita di efficienza;
3. conversione degli affitti brevi in locazioni (soglia sul premio R), canoni, prezzi, effetto patrimoniale;
4. occupazione, costi di transizione, indennità, spesa del dividendo in città;
5. conto economico del Comune, Fondo Armonizzatore, dividendo civico, famiglia tipo;
6. chi paga e chi riceve, quota del costo su non residenti, effetto netto sui residenti;
7. percorso anno per anno su dieci anni: la domanda si adegua con ritardo, le riconversioni convergono
   all'equilibrio, la riqualificazione è spesa quando i posti si perdono;
8. mappa delle scelte, sensibilità, incertezza (400 simulazioni), matrice degli effetti, verifiche numeriche.

Ogni ipotesi è etichettata come dato, stima, letteratura, regola o ipotesi, con la fonte e la derivazione.

## Costruire e verificare

```bash
python3 firenze/build.py                  # genera dividendo-firenze-it.html
node firenze/tests/model.test.js          # verifica numerica
python3 firenze/build.py --artifact FILE  # variante senza doctype per la pubblicazione come artefatto
```

Il PDF è generato nel browser con `pdf-lib` e `fontkit` (inclusi in `src/vendor`), con gli stessi caratteri
dell'anteprima. I caratteri (Source Sans 3, Source Serif 4, licenza OFL) sono incorporati in `src/fonts.js`;
i file originali non sono nel repository: per rigenerare i sottoinsiemi vedi `src/fonts/LEGGIMI.txt`.
