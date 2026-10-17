VACCINE MANAGEMENT STOCK SUMMARY — INTEGRATION

Files in this package:
1. vaccinemanagement.html
   Copy to: public/views/vaccinemanagement.html
   This is the complete HTML page based on the HTML supplied by the user. The stock-summary root is placed inside .card.stock-card, after .ems-check-menu. The REPORT button markup is also closed correctly.

2. vaccinemanagement.client.js
   Copy to: public/modules/vaccinemanagement/vaccinemanagement.client.js

3. vaccinemanagement.style.css
   Copy to: public/modules/vaccinemanagement/vaccinemanagement.style.css

IMPORTANT — SPA ROUTE
In public/assets/js/app.js, update only the existing "vaccine-management" route so it loads the module. Example:

"vaccine-management": {
  view: "/views/vaccinemanagement.html",
  script: "/modules/vaccinemanagement/vaccinemanagement.client.js",
  style: "/modules/vaccinemanagement/vaccinemanagement.style.css",
  system: "pharmacy"
},

Use this only if your app.js route loader supports the `script` and `style` properties in this format. The JavaScript module exports init() and destroy(); the SPA loader must call init() after loading the view and destroy() when leaving the view. If your loader uses another convention, adapt the route/module loading to that convention rather than adding a second independent initializer.

API endpoints used (read-only):
- GET /api/vaccine-master
- GET /api/vaccine-master/:code/stock

The stock endpoint must return current balance per LOT/EXP for the totals to be correct. This package does not modify stock receiving or movement data.
