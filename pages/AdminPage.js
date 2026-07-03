// pages/AdminPage.js
export class AdminPage {
  constructor(page) {
    this.page = page;

    // Stats — stat-total = "Total users" card, stat-revenue = "AI Readiness
    // paid (pending)" card (the app has no literal revenue figure)
    this.totalSubmissions = page.getByTestId('stat-total');
    this.revenueEstimate = page.getByTestId('stat-revenue');

    // Tables — BOTH the AI Readiness and IT Maturity tables carry
    // assessments-table, so single-element assertions use .first()
    this.assessmentsTables = page.getByTestId('assessments-table');
    this.assessmentsTable = this.assessmentsTables.first();
    this.tableRows = this.assessmentsTables.locator('tbody tr');
    this.viewLinks = page.getByRole('link', { name: /^view/i });
  }

  async goto() {
    await this.page.goto('/dashboard/admin');
  }

  /** Counts data rows across both assessment tables. */
  async getRowCount() {
    return await this.tableRows.count();
  }
}
