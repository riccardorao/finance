// Research notes per company. Facts come from company reports and press coverage retrieved on 1 Oct 2026;
// figures quoted in US dollars are as reported by the company, everything else is in euro.
module.exports = {
  US67066G1040: {
    tagline: 'The AI accelerator leader, with a software moat and a record buyback.',
    business: 'Designs the GPUs, networking and software (CUDA) on which most large AI models are trained and served. Data Center now makes up about 92% of revenue, so the stock is effectively a read on AI infrastructure spending.',
    thesis: [
      'Customer spending keeps compounding: data-centre revenue grew 117% year on year to $89.0bn in the quarter ended 26 July.',
      'Pricing power: gross margin held at 75.0% while volumes more than doubled.',
      'Capital return: the buyback authorisation was raised by $150bn to a record $235bn, to run through fiscal 2028.',
    ],
    risks: [
      'Customer concentration: hyperscalers alone were $48.7bn of data-centre revenue.',
      'Export-licence swings for China, and custom chips from the large cloud providers.',
      'Expectations are high, so a revenue beat can still be met with a flat or lower share price.',
    ],
    news: [
      ['2026-09-28', 'Raised its buyback by $150bn to $235bn in total, the largest programme in US history according to press reports. Shares rose.'],
      ['2026-09-28', 'Launched the Open Agent Safety Platform, an open reference design for controlling AI agents inside data centres.'],
      ['2026-09-30', 'After an AI summit, President Trump signalled self-regulation by AI companies rather than new rules, which eased regulatory worries.'],
      ['2026-08', 'Q2 fiscal 2027: revenue $96.2bn (+106% year on year), 5.7% above its own guidance; third-quarter revenue guided to about $108bn.'],
    ],
    sources: [
      { t: 'NVIDIA Q2 FY2027 results', u: 'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Second-Quarter-Fiscal-2027/default.aspx' },
      { t: 'NVIDIA 8-K, Q2 FY2027', u: 'https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000073/q2fy27pr.htm' },
    ],
  },
  US8740391003: {
    tagline: 'World’s largest contract chipmaker. The AI chips others design are made here.',
    business: 'Manufactures leading-edge chips and advanced packaging for Nvidia, Apple, AMD and many others. The US-listed ADR is priced in dollars, so a euro investor carries currency risk on top of the stock’s own moves.',
    thesis: [
      'Leading-edge capacity is the scarce input to AI hardware. Management says the roughly 20 fabs it is building still cannot satisfy demand.',
      'Guidance raised: 2026 revenue growth is now above 40% in dollar terms, with capital spending of $60–64bn.',
      'Profitability rising: Q2 operating margin was 60.3% (49.6% a year earlier) and earnings per ADR were $4.31 against $2.47.',
    ],
    risks: [
      'Taiwan geopolitics is the risk no balance sheet can hedge.',
      'Heavy capital spending leaves little room if AI orders slow.',
      'Revenue is increasingly tied to a handful of AI customers.',
    ],
    news: [
      ['2026-09-10', 'August revenue of NT$514.8bn, up 53% year on year and 10% on the previous month.'],
      ['2026-09-23', 'ADR traded at $451.95, 5.7% below its 52-week high of $479.00.'],
      ['Q2 2026', 'Revenue up 36% year on year to NT$1.27tn, and the full-year growth outlook was lifted to above 40%.'],
    ],
    sources: [
      { t: 'Bloomberg: TSMC revenue rises 53%', u: 'https://www.bloomberg.com/news/articles/2026-09-10/tsmc-revenue-rises-53-as-ai-chip-demand-outstrips-supply' },
      { t: 'TheStreet: TSMC hikes 2026 guidance', u: 'https://www.thestreet.com/investing/stocks/tsmc-hikes-2026-guidance-ai-demand' },
      { t: 'Yahoo Finance: Taiwan Semi revenue', u: 'https://finance.yahoo.com/markets/stocks/articles/taiwan-semi-revenue-keeps-surging-211457931.html' },
    ],
  },
  US02079K3059: {
    tagline: 'Search, YouTube, Cloud and the Gemini models under one roof.',
    business: 'Earns most of its profit from Search and YouTube advertising. Google Cloud and the Gemini AI models are the growth engines, with Android and Waymo as longer-dated options.',
    thesis: [
      'Cloud has accelerated: Q2 revenue rose 82% to $24.8bn and operating income reached $8.8bn (from $2.8bn a year earlier).',
      'Gemini has scale: the app has about 950 million monthly users, and nearly 90% of the Fortune 100 use Gemini Enterprise.',
      'A very large advertising business funds the AI build-out.',
    ],
    risks: [
      'Capital spending: 2026 capex was lifted to as much as $205bn, which weighed on free cash flow and on the shares after the 22 July report.',
      'AI assistants could erode Search over time.',
      'Regulatory and antitrust exposure remains.',
    ],
    news: [
      ['2026-10-01', 'Rolling out the Gemini 4 “Argon” model. Insiders reportedly doubt its coding performance.'],
      ['2026-09-29', 'Google Assistant is being replaced by Gemini on Android devices; users report problems with some functions.'],
      ['2026-09-24', 'Plans to launch a test satellite carrying TPUs (Project Suncatcher) to explore orbital AI data centres.'],
      ['2026-07-22', 'Q2 revenue $119.8bn (+24%) and EPS $9.11. Shares fell as the capex outlook rose.'],
    ],
    sources: [
      { t: 'CNBC: Alphabet Q2 earnings', u: 'https://www.cnbc.com/2026/07/22/google-earnings-q2-goog-live-updates.html' },
      { t: 'Yahoo Finance: Q2 2026 earnings', u: 'https://finance.yahoo.com/markets/stocks/articles/alphabet-q2-2026-earnings-revenue-203058727.html' },
      { t: '9to5Google: Q2 2026 results', u: 'https://9to5google.com/2026/07/22/alphabet-q2-2026-earnings/' },
    ],
  },
  US5324571083: {
    tagline: 'The GLP-1 leader, with an injectable, a pill and a next-generation drug in late trials.',
    business: 'Makes tirzepatide (Mounjaro for diabetes, Zepbound for obesity) and the new oral GLP-1 Foundayo (orforglipron). Revenue rose 48% to $23.0bn in Q2 2026.',
    thesis: [
      'Volume growth in the incretin class: Mounjaro $9.94bn (+91%) and Zepbound $4.93bn (+46%) in Q2.',
      'A broadening pipeline: Foundayo was approved by the FDA on 1 April and launched in Q2; retatrutide has a filing planned for Q1 2027.',
      'Guidance raised: 2026 revenue of $85–87bn.',
    ],
    risks: [
      'Pricing and insurer access in the US obesity market, and competition from Novo Nordisk.',
      'The FDA asked for more safety information around the Foundayo launch.',
      'Little correlation with AI and semiconductor stocks is a diversifier, but it also means the stock will not move with the AI trade.',
    ],
    news: [
      ['2026-10-01', 'New ATTAIN-1 analyses: orforglipron cut the predicted 10-year risk of type 2 diabetes by 45–57% against placebo, and the top dose cut predicted cardiovascular risk by 18%.'],
      ['2026-09-29', 'Analyses indicate Zepbound produces greater average weight loss than the higher dose of Wegovy, and Foundayo compares well with oral semaglutide in an indirect comparison.'],
      ['2026-08', 'Q2: revenue +48%, non-GAAP EPS $8.38 (+33%), full-year revenue guidance lifted to $85–87bn.'],
    ],
    sources: [
      { t: 'Lilly Q2 2026 results (press release)', u: 'https://www.prnewswire.com/news-releases/lilly-reports-second-quarter-2026-financial-results-raises-full-year-guidance-and-highlights-continued-growth-and-pipeline-progress-302843165.html' },
      { t: 'CNBC: Foundayo approved', u: 'https://www.cnbc.com/2026/04/01/eli-lilly-glp-1-pill-foundayo-approved-for-obesity.html' },
      { t: 'Fierce Pharma: FDA on Foundayo safety data', u: 'https://www.fiercepharma.com/pharma/fda-tells-eli-lilly-round-more-safety-info-key-obesity-launch-foundayo' },
    ],
  },
  US5951121038: {
    tagline: 'Memory chips (DRAM, HBM, NAND), now priced like AI infrastructure.',
    business: 'One of three major DRAM makers and a supplier of high-bandwidth memory (HBM) to AI accelerators. Memory is cyclical: prices swing sharply with supply and demand, and the share price swings with them.',
    thesis: [
      'AI has made memory scarce: fiscal Q4 revenue was $54.2bn (+379% year on year) with adjusted EPS of $33.42, and full-year revenue reached $133.2bn.',
      'Visibility: agreements already cover the vast majority of 2027 HBM supply at higher prices, and the HBM4 ramp is under way.',
      'Guidance for the next quarter is about $61.5bn of revenue and $38.15 of EPS.',
    ],
    risks: [
      'Cyclicality: the shares fell 28.7% in July on glut fears, a weak SK Hynix report and Chinese competition (CXMT).',
      'Margins near record levels invite new capacity from rivals.',
      'Memory is the most cyclical corner of semiconductors, and the share price has swung accordingly.',
    ],
    news: [
      ['2026-10-01', 'Shares slipped after record fiscal Q4 results as investors took profits. Revenue guidance of $60–63bn and EPS of $37.15–39.15 were above forecasts.'],
      ['2026-07-28', 'Memory stocks sold off after SK Hynix’s second-quarter results fell short of expectations. Micron lost 28.7% over July and rebounded from August.'],
    ],
    sources: [
      { t: 'Investing.com: Micron Q4 2026 call', u: 'https://www.investing.com/news/transcripts/earnings-call-transcript-micron-tops-q4-2026-estimates-as-demand-stays-hot-93CH-4925992' },
      { t: 'Yahoo Finance: Q4 call highlights', u: 'https://finance.yahoo.com/markets/stocks/articles/micron-technology-q4-earnings-call-230239520.html' },
      { t: 'Yahoo Finance: why Micron fell 28.7% in July', u: 'https://finance.yahoo.com/markets/stocks/articles/why-micron-stock-plummeted-28-112000538.html' },
    ],
  },
  US92537N1081: {
    tagline: 'Power and cooling equipment for data centres.',
    business: 'Sells the thermal-management and power systems that keep AI data centres running, plus the services around them. Growth follows data-centre build-outs, and liquid cooling is the fastest-growing piece.',
    thesis: [
      'Demand is there: Q2 organic growth was 18% and full-year adjusted EPS guidance was raised to $6.65–6.75 from $6.30–6.40.',
      'Liquid-cooling services are being built out by acquisition: PurgeRite in 2025 and King Environmental Services (agreed 24 September, closing expected in Q4).',
    ],
    risks: [
      'Timing: Q2 revenue of $3.27bn missed expectations of about $3.37bn and the shares fell 17% on 29 July (27.9% across July). Management called it temporary, citing supply-chain congestion and multi-phase projects.',
      'Dependence on a few hyperscale customers.',
      'High market sensitivity: beta of about 3 against the broad market over the last year.',
    ],
    news: [
      ['2026-09-24', 'Agreed to acquire King Environmental Services to extend liquid-cooling services in Europe, the Middle East and Africa. Shares fell on the day.'],
      ['2026-07-29', 'Q2 revenue missed, guidance was raised, and the shares dropped about 17%. The CEO called the shortfall a “temporary issue”.'],
    ],
    sources: [
      { t: 'CNBC: Vertiv CEO on the plunge', u: 'https://www.cnbc.com/2026/07/29/vertiv-ceo-addresses-stock-plunge-disappointing-quarter.html' },
      { t: 'Motley Fool: why Vertiv plunged in July', u: 'https://www.fool.com/investing/2026/08/11/why-vertiv-holdings-plunged-in-july/' },
      { t: 'Investing.com: Q2 revenue miss, upgraded guidance', u: 'https://www.investing.com/news/earnings/vertiv-shares-sink-as-q2-revenue-miss-offsets-upgraded-guidance-4819216' },
    ],
  },
  CA2926717083: {
    tagline: 'US uranium producer expanding into rare earths and magnets.',
    business: 'Produces uranium at its US mills and mines and separates rare-earth oxides, including terbium. The strategy is to move downstream into metals, alloys and permanent magnets.',
    thesis: [
      'Uranium output is ramping: 1.7m lb finished in the first half, already above the low end of the 1.5–2.5m lb full-year guidance. Q2 uranium concentrate revenue was $60.7m against $3.9m a year earlier.',
      'Mine-to-magnet: terbium oxide was qualified by a large non-China magnet maker in August, the Australian Strategic Materials acquisition closed in late August, and a purchase of magnet maker Vacuumschmelze is planned for as early as Q1 2027.',
    ],
    risks: [
      'Commodity price: uranium spot fell 8.7% in September, its largest monthly drop since March 2019, to about $89 per lb.',
      'Execution and financing of several acquisitions at once.',
      'A deep drawdown: roughly 60% from the October 2025 peak.',
    ],
    news: [
      ['2026-09-21', 'Shares rose 5.4% as uranium and rare-earth names bounced, but they were still down about 24% over the previous month.'],
      ['2026-09', 'Uranium stocks fell as spot uranium dropped 8.7%. Spot ended September at about $89.45 per lb.'],
      ['2026-08', 'Terbium oxide qualified by one of the world’s largest magnet makers outside China; ASM acquisition completed.'],
    ],
    sources: [
      { t: 'Energy Fuels Q2 2026 results', u: 'https://www.prnewswire.com/news-releases/energy-fuels-announces-q2-2026-results-302844191.html' },
      { t: 'Sprott: Uranium’s September setback', u: 'https://sprott.com/insights/uraniums-september-setback/' },
      { t: 'Kalkine: stock climbs 5.44%', u: 'https://kalkine.ca/news/mining/energy-fuels-stock-climbs-544-as-uranium-strength-and-rare-earth-expansion-revive-investor-optimism' },
    ],
  },
  US5533681012: {
    tagline: 'The US rare-earth miner that is building its own magnet production.',
    business: 'Mines and processes rare earths at Mountain Pass in California and is moving into magnets. General Motors is the first major customer: magnets have been delivered for qualification and commercial shipments are expected in Q4 2026.',
    thesis: [
      'Operations are scaling: Q2 revenue rose 89% and output of NdPr oxide (the key magnet material) was up 41%.',
      'Magnets turn a commodity miner into a manufacturer, and sit at the centre of Western efforts to reduce reliance on China.',
    ],
    risks: [
      'China policy swings both ways: export curbs lifted the shares on 4 September, while easing would do the opposite.',
      'On 18 September Reuters reported that China Rare Earth Group is in talks to buy Shenghe Resources, MP’s exclusive China offtake partner and a holder of about 3% of its shares.',
      'Baird cut its price target to $65 from $80 in late September. The shares fell about 21% in a month before bouncing 6% on 30 September.',
    ],
    news: [
      ['2026-09-30', 'Shares jumped about 6% as traders weighed the critical-minerals growth story.'],
      ['2026-09-18', 'Reuters: state-owned China Rare Earth Group in talks to acquire Shenghe Resources, which holds about 3% of MP.'],
      ['2026-09-04', 'Shares popped after China curbed shipments of rare earths to the US.'],
    ],
    sources: [
      { t: 'Yahoo Finance: disputed China shareholder report', u: 'https://finance.yahoo.com/markets/stocks/articles/mp-materials-mp-faces-disputed-003420226.html' },
      { t: '24/7 Wall St: MP sank 21% in a month', u: 'https://247wallst.com/investing/2026/09/28/mp-materials-just-sank-21-in-a-month-is-it-time-to-sell-or-is-this-a-prime-buying-opportunity/' },
      { t: 'Motley Fool: first magnets to GM in Q4', u: 'https://www.fool.com/investing/2026/09/26/mp-materials-ships-its-first-magnets-to-gm-in-q4-t/' },
      { t: 'Schaeffer’s: shares pop after China curbs shipments', u: 'https://www.schaeffersresearch.com/content/news/2026/09/04/mp-materials-rare-earth-stocks-pop-after-china-curbs-us-shipments' },
    ],
  },
};
