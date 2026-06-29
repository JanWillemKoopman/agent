# App Design System (Geïnspireerd op AH Mobile UI)

Dit document beschrijft de UI-richtlijnen gebaseerd op de mobiele interface van Albert Heijn.

## 1. Kleurenpalet & Branding
*   **Primary (AH Blauw):** `#00a0e2` (Header-logo, inlog-knop, primaire actie-knoppen).
*   **Bonus Oranje (Aanbiedingen):** `#f28e00` (Gebruik dit voor actie-labels: "2e gratis", "25% korting", "Bonus").
*   **Action Blue (Secondary):** `#00a0e2` (De ronde '+' knoppen en 'Kies' knoppen in de productlijsten).
*   **Background:** `#ffffff` (Wit) voor secties, `#f4f5f7` (Lichtgrijs) voor de achtergrond van productkaarten en pagina-containers.
*   **Text:** `#1b1b1b` (Zwart/donkergrijs voor titels en beschrijvingen).

## 2. Header & Navigatie (Zie image_4.png, image_9.png)
*   **Header:** Witte achtergrond met een dunne grijze onderlijn.
*   **Logo:** AH logo linksboven (`#00a0e2`).
*   **Search:** Een lichtgrijze, volledig afgeronde zoekbalk (`#f4f5f7`) met een vergrootglas-icoon links.
*   **Navigatie:** Iconen (menu, hartje, winkelmandje) zijn minimalistisch en grijs/zwart.

## 3. Productkaarten (Zie image_2.png, image_6.png)
*   **Opbouw:** Wit vlak met een afbeelding gecentreerd bovenaan.
*   **Labels:** Linksonder staat de Nutri-Score (A-E icoontjes) en eventuele vegan-icoontjes.
*   **Aanbiedingen:** Oranje rechthoekige badge (bijv. "2e gratis") direct onder de titel.
*   **Prijzen:**
    *   Huidige prijs: Groot, vetgedrukt, zwart.
    *   Oude prijs: Kleiner, grijs, doorgestreept (alleen bij korting).
*   **Actie-knop:**
    *   Een blauwe cirkel met een wit plus-teken (`+`) voor toevoegen.
    *   De tekst 'Kies' in een afgeronde blauwe rechthoek als er variatiekeuze is (bijv. bij Ben & Jerry's).

## 4. Typography & Layout (Zie image.png, image_3.png, image_8.png)
*   **Font:** Strakke schreefloze lettertypen.
*   **Titels:** Vetgedrukt, relatief groot (h1/h2 voor sectietitels zoals "Vaak gekocht" of "Meer van dit merk").
*   **Detailpagina's:** Ingrediënten en voedingswaarden staan in een schone, leesbare lijst met veel witruimte. Secties zijn gescheiden door subtiele horizontale lijnen.

## 5. UI Patronen (UX)
*   **Modale/Pop-ups:** Gebruik een simpele witte overlay met scherpe randen.
*   **Afbeeldingen:** Producten worden altijd vrijstaand (zonder achtergrond) getoond.
*   **Lijsten:** Gebruik 'accordion' of 'chevron' iconen (>) voor secties als 'Nu populair' of 'Vaak gekocht'.

## 6. Implementatie-tokens (code)
Deze tokens zijn gecodeerd in `tailwind.config.js` (`theme.extend`) en als CSS-variabelen in `src/app/globals.css`.

*   **Kleuren (Tailwind):** `ahBlue #00a0e2`, `bonusOrange #f28e00`, `dark #1b1b1b`, `appBg #f4f5f7`, `surface #ffffff`.
*   **Font:** `system-ui, sans-serif` (strak, schreefloos).
*   **Iconen:** [Phosphor Icons](https://phosphor.icons) via CDN, **Regular/outline-stijl**.
    *   24px voor hoofdnavigatie (bijv. `ph-gear` in de header).
    *   20px/16px voor in-line elementen (badges, knoppen, statusregels).
*   **Cards:** `box-shadow: 0 2px 8px rgba(0,0,0,0.05)` (Tailwind: `shadow-card`), afgeronde hoeken `8px` (`rounded-card`).
*   **Knoppen:** pill-vormig, `border-radius: 9999px` (`rounded-pill`). Primaire actie in `ahBlue`.
*   **Bonus-badge:** rechthoekige `bonusOrange` badge met witte, vetgedrukte hoofdletters (bijv. "3x BONUS DEALS").
