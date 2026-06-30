Voordat je wijzigingen maakt moet je eerst een ontwerpdocument schrijven.

Dit document bevat minimaal:

- analyse huidige implementatie

- gevonden knelpunten

- voorgestelde architectuur

- alternatieven

- risico's

- impact op bestaande code

- bestanden die gewijzigd worden

- database impact

- API impact

Schrijf pas code nadat dit ontwerpdocument is goedgekeurd.

Jij bent verantwoordelijk voor deze wijziging.

Gedraag je alsof jij de software architect bent.

Wanneer je denkt dat een onderdeel beter kan dan in deze prompt staat, beschrijf dit.

Onderbouw je keuze.

Pas daarna de implementatie aan.

Voordat je een oplossing kiest wil ik minimaal drie mogelijke architecturen zien.

Voor iedere architectuur:

Voordelen

Nadelen

Complexiteit

Onderhoudbaarheid

Schaalbaarheid

Waarom je deze wel of niet kiest.

Voer nu een volledige code review uit op je eigen wijzigingen.

Zoek actief naar:

- bugs

- regressies

- race conditions

- memory leaks

- over-engineering

- duplicatie

- onnodige complexiteit

Verbeter deze daarna.



# ====================================================================================
# PROMPT 1 — MAXIMALISEER DE VOLLEDIGHEID VAN SUPERMARKTDEALS
# ====================================================================================

## Rol

Je bent een Senior Software Architect die verantwoordelijk is voor het verder ontwikkelen van FamApp.

Je schrijft geen compleet nieuwe applicatie.

Je verbetert een bestaande codebase.

Respecteer daarom altijd de bestaande architectuur, coding style en ontwerpkeuzes.

Voer geen onnodige refactors uit.

Pas uitsluitend de onderdelen aan die nodig zijn voor deze optimalisatie.

---

# Achtergrond

Voordat je begint moet je begrijpen wat FamApp probeert op te lossen.

FamApp is GEEN commerciële SaaS.

FamApp is GEEN startup.

FamApp wordt gebruikt door één gezin en eventueel enkele vrienden.

Hierdoor gelden compleet andere ontwerpkeuzes dan bij een commercieel product.

Normaal zou je optimaliseren voor:

- lage API-kosten
- snelheid
- schaalbaarheid

Voor FamApp geldt juist het tegenovergestelde.

Optimaliseer voor:

- volledigheid
- kwaliteit
- inspiratie
- betrouwbaarheid

Wanneer een generatie twee minuten duurt maar hierdoor 40% meer aanbiedingen worden gevonden, dan is dat een verbetering.

Wanneer twintig extra Gemini-calls leiden tot een completere dataset is dat acceptabel.

API-kosten spelen vrijwel geen rol.

---

# De huidige situatie

Volgens de huidige architectuur werkt het ophalen van aanbiedingen als volgt.

Voor iedere supermarkt wordt een Forager gestart.

Deze Forager vraagt via Gemini batches met aanbiedingen op.

Na iedere batch wordt opnieuw gezocht waarbij reeds gevonden producten worden uitgesloten.

Dit proces stopt na maximaal vijf iteraties.

De resultaten worden vervolgens opgeslagen in de dagelijkse cache (`daily_deals`).

Deze architectuur is efficiënt.

Maar efficiëntie is niet langer het belangrijkste doel.

---

# Het fundamentele probleem

De complete kwaliteit van FamApp wordt bepaald door de kwaliteit van de inputdata.

Wanneer slechts 60% van de aanbiedingen wordt gevonden kan de Chef nooit recepten bedenken met de overige 40%.

Dit betekent dat iedere gemiste aanbieding uiteindelijk resulteert in gemiste recepten.

Daardoor mist de gebruiker inspiratie.

En inspiratie is precies het hoofddoel van FamApp.

De huidige Forager is daarom niet agressief genoeg.

Hij stopt te vroeg.

Hij zoekt te generiek.

Hij controleert onvoldoende of werkelijk alle categorieën gevonden zijn.

De pipeline accepteert momenteel impliciet dat een onbekend aantal aanbiedingen niet wordt opgehaald.

Dat is voor dit project niet acceptabel.

---

# Nieuwe ontwerpfilosofie

De Forager is niet langer een scraper.

De Forager wordt een "Data Collector".

Zijn enige taak is:

"Verzamel een zo compleet mogelijke dataset."

Niet:

"Verzamel snel voldoende data."

Iedere volgende AI-agent vertrouwt volledig op deze dataset.

Daarom moet de kwaliteit hiervan zo hoog mogelijk zijn.

Zie de Forager als de fundering van een huis.

Wanneer de fundering slecht is wordt de rest automatisch ook slechter.

```

## Doel van deze optimalisatie

Na deze wijziging moet FamApp aanzienlijk meer aanbiedingen kunnen verzamelen dan voorheen.

Niet door één parameter aan te passen.

Maar door de complete zoekstrategie slimmer te maken.

Het doel is niet een exact aantal aanbiedingen.

Het doel is een zo compleet mogelijke representatie van alle actuele weekaanbiedingen.

De gebruiker moet erop kunnen vertrouwen dat vrijwel niets wordt gemist.


---

Optimaliseer NIET voor:

- micro performance

- API calls

- abstracte generic frameworks

- enterprise patterns

- dependency injection tenzij al aanwezig

- premature optimisation

---

# Ontwerpprincipes

Houd tijdens de implementatie onderstaande principes aan.

## Principe 1

Volledigheid gaat vóór snelheid.

---

## Principe 2

Gebruik meerdere AI-calls wanneer dat de dekking vergroot.

---

## Principe 3

Gebruik verschillende zoekstrategieën.

Niet iedere prompt vindt dezelfde aanbiedingen.

Variatie verhoogt de kwaliteit.

---

## Principe 4

Verzamel liever dubbele resultaten dan ontbrekende resultaten.

Duplicaten kunnen softwarematig verwijderd worden.

Gemiste aanbiedingen kunnen nooit meer worden teruggevonden.

---

## Principe 5

Gebruik AI alsof je meerdere onderzoekers inzet.

Iedere AI-call mag vanuit een andere invalshoek zoeken.

```

---

# De implementatie (deel 2)

In het volgende deel gaan we Claude Code precies vertellen **hoe** de Forager opnieuw ontworpen moet worden. Daar gaan we veel verder dan "verhoog de limiet van 5 naar 20". We introduceren onder andere:

- een **Search Strategy Engine**;
- meerdere gespecialiseerde zoekprompts per supermarkt;
- automatische deduplicatie;
- een **Coverage Score** die de kwaliteit van de dataset meet;
- validatie of belangrijke categorieën ontbreken;
- en een iteratief proces waarbij Gemini actief zoekt naar mogelijk gemiste aanbiedingen.

**Persoonlijk zou ik de Forager volledig herbouwen.** Niet omdat de huidige versie slecht is, maar omdat de Forager het fundament van de hele applicatie is. Als je die 30% beter maakt, wordt vrijwel de hele app automatisch beter. Dat is precies waarom ik deze optimalisatie als **prioriteit #1** zie.


# Nieuwe Architectuur

De huidige Forager gebruikt één generieke zoekstrategie.

Dat is niet langer voldoende.

Je opdracht is NIET om simpelweg de bestaande lus uit te breiden.

Je opdracht is om een intelligent systeem te ontwerpen dat meerdere onafhankelijke zoekstrategieën combineert tot één complete dataset.

Denk hierbij alsof meerdere menselijke onderzoekers tegelijkertijd dezelfde folder proberen te reconstrueren.

Iedere onderzoeker kijkt vanuit een andere invalshoek.

Aan het einde worden alle resultaten samengevoegd.

---

# Nieuwe Architectuur

De nieuwe Forager bestaat uit vier afzonderlijke fases.

Iedere fase heeft een eigen verantwoordelijkheid.

Fase 1

Breed verzamelen

↓

Fase 2

Gericht zoeken naar ontbrekende categorieën

↓

Fase 3

Validatie van de dekking

↓

Fase 4

Automatische herstelronde

Pas daarna mag de dataset worden opgeslagen in de daily cache.

---

# Fase 1 — Breed verzamelen

De eerste fase lijkt op de huidige implementatie.

Maar de zoekruimte wordt veel groter.

Vergroot niet alleen het aantal iteraties.

Gebruik meerdere verschillende prompts.

Bijvoorbeeld:

Prompt A

Zoek alle aanbiedingen.

Prompt B

Zoek alleen Bonus-acties.

Prompt C

Zoek alle aanbiedingen uit de folder.

Prompt D

Zoek uitsluitend tijdelijke acties.

Prompt E

Zoek producten met 1+1 of 2+1.

Iedere prompt zal deels overlappende maar ook unieke resultaten opleveren.

Deze overlap is gewenst.

---

# Fase 2 — Gespecialiseerde zoekstrategieën

Na de brede zoekronde begint een tweede ronde.

Hier zoekt iedere AI-call uitsluitend binnen één categorie.

Bijvoorbeeld:

- Groente
- Fruit
- Vlees
- Vis
- Vegetarisch
- Zuivel
- Kaas
- Brood
- Diepvries
- Pasta
- Rijst
- Sauzen
- Wereldkeuken
- Dranken
- Snacks
- Ontbijt
- Koffie
- Thee
- Huismerken
- A-merken

Iedere categorie krijgt een eigen prompt.

Gebruik hiervoor gespecialiseerde instructies.

Bijvoorbeeld:

"Zoek uitsluitend vleesproducten die deze week in de aanbieding zijn."

Daardoor krijgt Gemini veel meer focus.

De ervaring leert dat een gespecialiseerd zoekdoel vrijwel altijd completere resultaten oplevert dan één brede opdracht.

---

# Fase 3 — Samenvoegen

Na alle zoekrondes ontstaat een grote verzameling producten.

Deze bevat waarschijnlijk veel duplicaten.

Maak daarom een aparte normalisatie- en deduplicatiestap.

Gebruik hiervoor geen AI.

Gebruik deterministische software.

Normaliseer bijvoorbeeld:

- hoofdletters
- spaties
- leestekens
- verpakkingsgroottes
- merknotatie

Voorbeelden:

"AH Kipfilet 400 gram"

"Albert Heijn Kipfilet 400g"

"Kipfilet AH 400 g"

moeten uiteindelijk hetzelfde product worden.

Gebruik waar mogelijk fuzzy matching.

Het doel is een zo schoon mogelijke dataset.

---

# Fase 4 — Coverage Analyse

Dit onderdeel bestaat momenteel nog niet.

Voeg een aparte analysefase toe.

Deze fase beoordeelt de kwaliteit van de dataset.

Bijvoorbeeld:

Aantal producten

Aantal categorieën

Aantal aanbiedingen per categorie

Verdeling over productgroepen

Aantal unieke acties

Percentage producten met prijs

Percentage producten zonder dealtype

Maak hiervan een Coverage Report.

Voorbeeld:

Albert Heijn

Producten gevonden:

184

Categorieën gevonden:

18 van 20

Categorie ontbreekt:

- Bakkerij

- Baby

Vertrouwensscore:

94%

Dit rapport hoeft niet direct zichtbaar te zijn in de gebruikersinterface.

Het mag in eerste instantie uitsluitend bedoeld zijn voor debugging en kwaliteitscontrole.

---

# Fase 5 — Recovery Search

Nu komt misschien wel de belangrijkste verbetering.

Wanneer de Coverage Analyse constateert dat een categorie ontbreekt...

...moet de Forager NIET stoppen.

Hij moet zichzelf corrigeren.

Voorbeeld:

Er zijn geen aanbiedingen gevonden voor:

Diepvries

Start automatisch een nieuwe AI-opdracht.

Prompt:

"Zoek uitsluitend diepvriesproducten die deze week in de aanbieding zijn."

Voeg deze producten vervolgens toe aan de dataset.

Herhaal daarna opnieuw de Coverage Analyse.

Blijf dit doen totdat:

- alle categorieën voldoende gevuld zijn

OF

- een maximaal aantal herstelrondes bereikt is.

Hiermee ontstaat een zelfcorrigerend systeem.

In plaats van één lineaire AI-call ontstaat een iteratief zoekproces.

Dat past veel beter bij het doel van FamApp.

---

# Parallelisatie

De huidige code gebruikt al parallelle AI-calls.

Behoud dit principe.

Sterker nog:

breid het uit.

Categorie-opdrachten hoeven niet op elkaar te wachten.

Laat zoveel mogelijk zoekstrategieën gelijktijdig draaien.

De totale wachttijd mag toenemen.

Dat is acceptabel.

De kwaliteit van de dataset is belangrijker.

Waarom ik dit een veel betere architectuur vind

Dit is eigenlijk een fundamentele verschuiving:

Huidige Forager:

"Zoek aanbiedingen."

Nieuwe Forager:

"Bewijs dat je de aanbiedingen compleet hebt gevonden."

Dat is een enorm verschil. De huidige pipeline accepteert impliciet dat er altijd iets gemist wordt. De nieuwe pipeline probeert actief gaten in de dataset op te sporen en te vullen. Voor jouw doel—zoveel mogelijk inspiratie uit actuele aanbiedingen halen—vind ik dat een veel sterkere aanpak. Ik denk zelfs dat dit uiteindelijk de grootste kwaliteitsverbetering van de hele app zal opleveren.

ga en nu verder wat gaan we nog meer opnemen in het document?

Nu komen we eigenlijk bij het verschil tussen een goede prompt en een architectuurdocument.

Ik zou Claude Code namelijk niet alleen vertellen wat hij moet bouwen, maar hem ook laten nadenken over ontwerpbeslissingen. Dat is iets waar Claude ontzettend sterk in is.

Ik denk dat Prompt 1 uiteindelijk uit ongeveer de volgende hoofdstukken moet bestaan.

1. Context (hebben we grotendeels gedaan)
Doel van FamApp
Nieuwe missie
Waarom snelheid ondergeschikt is
Waarom kwaliteit belangrijker is
Waarom API-kosten niet leidend zijn
2. Analyse van de huidige implementatie

Hier wil ik Claude eerst laten analyseren.

Niet meteen coderen.

Bijvoorbeeld:

Analyseer eerst de volledige huidige implementatie.

Beschrijf daarna:

- Hoe werkt forageDeals() precies?
- Welke helperfuncties worden gebruikt?
- Waar wordt gecached?
- Waar vindt deduplicatie plaats?
- Waar wordt de daily cache opgeslagen?
- Hoe wordt polling gebruikt?
- Welke tabellen zijn hierbij betrokken?

Geef vervolgens aan welke onderdelen behouden kunnen blijven.

Maak pas daarna een implementatieplan.

Waarom?

Omdat Claude anders soms hele delen gaat herschrijven die prima zijn.

3. Architectuurprincipes

Bijvoorbeeld:

Behoud altijd:

- Daily cache

- Kitchen Brigade

- Pipeline

- bestaande logging

- bestaande API's

- huidige database

Introduceer geen nieuwe dependencies tenzij absoluut noodzakelijk.

Voorkom grote refactors.

Breid liever bestaande componenten uit.

Dat voorkomt dat Claude ineens Redis of RabbitMQ gaat introduceren.

4. Search Strategy Engine ⭐⭐⭐⭐⭐

Persoonlijk denk ik dat dit de mooiste verbetering wordt.

Niet:

for i in range(20)

Maar echt een nieuwe architectuur.

Bijvoorbeeld:

SearchStrategy

name

description

priority

prompt

expectedCategories

retryWeight

enabled


Dan kun je straks eenvoudig nieuwe strategieën toevoegen.

Bijvoorbeeld:

Folder Search

Bonus Search

BBQ Search

Paasaanbiedingen

Kerst

Pasen

Halloween

Back to school


zonder code aan te passen.

5. Prompt-engineering

Hier wil ik Claude echt laten nadenken.

Ik zou letterlijk schrijven:

De kwaliteit van FamApp wordt grotendeels bepaald door prompt engineering.

Besteed daarom veel aandacht aan:

- duidelijke instructies

- weinig ambiguïteit

- expliciete JSON output

- productnamen exact overnemen

- verpakkingsgrootte behouden

- geen samenvattingen

- geen interpretaties

- geen schattingen wanneer informatie ontbreekt

Beschrijf ook waarom iedere prompt zo is opgebouwd.

Dit is enorm belangrijk.

6. Coverage Engine ⭐⭐⭐⭐⭐

Niet alleen:

Coverage = 92%

Maar echt intelligent.

Bijvoorbeeld:

Coverage

↓

Product Count

↓

Category Completeness

↓

Missing Categories

↓

Deal Diversity

↓

Confidence Score

↓

Recovery Suggestions


Dan kan Claude zelf veel slimmere algoritmes bedenken.

7. Recovery Engine ⭐⭐⭐⭐⭐

Hier denk ik dat Claude echt kan schitteren.

Bijvoorbeeld:

Coverage ziet:

Groente ontbreekt

↓

Recovery Prompt

↓

Nieuwe resultaten

↓

Merge

↓

Coverage opnieuw

↓

Nog steeds slecht?

↓

Nieuwe recovery


Dus eigenlijk een AI die zijn eigen werk controleert.

Dat is veel slimmer dan gewoon meer iteraties.

8. Deduplicatie Engine

Hier wil ik Claude echt vrijheid geven.

Ik zou schrijven:

Ontwerp een robuuste deduplicatie.

Denk aan:

- fuzzy matching

- merkherkenning

- gewicht

- inhoud

- verpakkingen

- synoniemen

- hoofdletters

- afkortingen

- huismerken

Beschrijf eerst je aanpak.

Implementeer daarna pas de code.
9. Kwaliteitscontrole

Dit mis ik eigenlijk volledig in de huidige app.

Bijvoorbeeld:

Controleer automatisch:

- ontbrekende prijzen

- negatieve prijzen

- onmogelijke aanbiedingen

- dubbele producten

- lege namen

- ontbrekende supermarkt

- ontbrekende dealtypes

- vreemde hoeveelheden

Genereer een kwaliteitsrapport.
10. Logging

Niet zomaar logging.

Maar echt bruikbare logging.

Bijvoorbeeld:

Forager gestart

↓

Prompt A

↓

gevonden 42 producten

↓

12 duplicaten

↓

30 uniek

↓

Coverage 84%

↓

Recovery gestart

↓

Coverage 96%

↓

Opslaan


Fantastisch voor debugging.

11. Metrics

Ik zou Claude ook laten nadenken over statistieken.

Bijvoorbeeld:

Gemiddeld aantal producten

Gemiddelde coverage

Gemiddelde AI calls

Recovery succespercentage

Duplicaatpercentage

Gemiddelde duur

Gemiddeld aantal categorieën


Na een paar weken weet je precies hoe goed de scraper is.

12. Acceptatiecriteria

Heel concreet.

Bijvoorbeeld:

De implementatie is pas klaar wanneer:

✓ minstens 2x zoveel aanbiedingen worden gevonden

✓ coverage zichtbaar is

✓ recovery werkt

✓ duplicaten verwijderd worden

✓ bestaande API compatibel blijft

✓ caching nog werkt

✓ geen bestaande functionaliteit stuk is

✓ tests slagen

✓ logging aanwezig is

✓ documentatie is bijgewerkt
13. Testplan

Hier gaan veel AI-prompts de mist in.

Ik zou Claude verplicht laten testen.

Bijvoorbeeld:

Test:

Albert Heijn

Jumbo

Lidl

PLUS

Aldi

Lege dataset

Foute JSON

Rate limit

Gemini timeout

Dubbele producten

Geen aanbiedingen

1000 aanbiedingen

Controleer daarna:

Coverage

Duplicates

Performance

Logging

Database

14. Reflectie (mijn favoriete onderdeel)

Dit zie je bijna nooit in AI-prompts.

Ik zou eindigen met:

Voordat je begint met programmeren wil ik dat je jezelf de volgende vraag stelt:

"Als ik deze app voor mijn eigen gezin zou bouwen, zou ik dan vertrouwen hebben dat ik deze week vrijwel geen interessante aanbieding mis?"

Als het antwoord nee is, is de implementatie nog niet af.

Wat ik uiteindelijk voor ogen heb

Ik denk dat we niet een verzameling prompts gaan maken, maar iets veel waardevollers:

FamApp AI Architecture Handbook

Een document van ongeveer 60–80 pagina's waarin iedere optimalisatie niet alleen een opdracht is, maar een complete ontwerpvisie.

Mijn doel zou zijn dat een willekeurige senior developer of Claude Code dit document krijgt, de codebase opent, en daarna vrijwel dezelfde ontwerpkeuzes maakt als jij zelf zou maken. Dat is uiteindelijk veel krachtiger dan een lijst met losse programmeeropdrachten.


---

Afsluiter:
Voordat je denkt dat de implementatie klaar is...

...stel jezelf de volgende vraag:

"Als deze applicatie morgen door mijn eigen vrouw gebruikt zou worden om boodschappen te doen...

...zou ik er volledig op vertrouwen dat ik vrijwel geen interessante aanbieding mis?"

Zo niet...

...ga terug naar de tekentafel.

De missie van FamApp is niet snelheid.

De missie is vertrouwen.