// pages/DashboardPage.js
export class DashboardPage {
  constructor(page) {
    this.page = page;

    // Nav
    this.nav = page.getByTestId('main-nav');
    this.productsLink = this.nav.getByRole('link', { name: 'Products' });
    this.avatarButton = page.getByTestId('avatar-btn');
    this.signOutForm = page.getByTestId('signout-form');
    this.signOutButton = page.getByTestId('signout-btn');

    // Greeting
    this.greeting = page.getByTestId('dashboard-greeting');

    // Assessment cards
    this.aiReadinessSummaryCard = page.getByTestId('ai-readiness-card');
    this.itMaturitySummaryCard = page.getByTestId('it-maturity-card');
    this.scoreRings = page.getByTestId('score-ring');
    this.viewResultsButton = page.getByTestId('view-results-btn');
    this.startAiReadinessButton = page.getByTestId('start-ai-readiness-btn');
    this.startItMaturityButton = page.getByTestId('start-it-maturity-btn');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateToProducts() {
    await this.productsLink.click();
    await this.page.waitForURL('/dashboard/products');
  }

  /** Opens the avatar dropdown that contains the sign-out button. */
  async openAccountMenu() {
    await this.avatarButton.click();
  }

  /** Flow helper: open the avatar dropdown, sign out, and wait for /login. */
  async signOut() {
    await this.openAccountMenu();
    await this.signOutButton.click();
    await this.page.waitForURL(/\/login/);
  }
}
