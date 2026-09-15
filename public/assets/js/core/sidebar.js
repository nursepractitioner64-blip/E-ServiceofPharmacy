export function renderSidebar() {
  return `
    <div class="sidebar">
      <div class="logo">
        <i class="fa-solid fa-capsules"></i>
        Pharmacy System
      </div>

      <ul class="menu">
        <li>
          <a href="#" data-route="dashboard">
            <i class="fa-solid fa-chart-line"></i>
            Dashboard
          </a>
        </li>

        <li>
          <a href="#" data-route="controlled-drug">
            <i class="fa-solid fa-pills"></i>
            Controlled Drug
          </a>
        </li>

        <li>
          <a href="#" data-route="emergency-checklist">
            <i class="fa-solid fa-truck-medical"></i>
            Emergency Check
          </a>
        </li>
      </ul>
    </div>
  `;
}
