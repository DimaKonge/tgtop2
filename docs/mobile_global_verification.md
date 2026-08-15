# Global Mobile Verification Notes

The live TG TOP Global screen was opened after the launch overlay completed. The rendered page showed the compact header, type rail, country/topic controls, 1→2→4 empty ranking board, and bottom navigation without runtime errors.

The automated Playwright acceptance script then rendered the page at a true **390 × 844** viewport. It found all seven featured ranking cards and measured their lowest edge at **677.95 px**, above the bottom-navigation top edge at **775 px**. The board therefore fit above navigation with approximately **97 px** of remaining clearance.
