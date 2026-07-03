// pages/LandingPage.js
// The public landing page has no data-testid attributes, so this Page Object
// uses role- and accessible-text-based locators anchored to real markup.
export class LandingPage {
  constructor(page) {
    this.page = page;

    // Nav / CTA
    this.loginLink = page.getByRole('link', { name: 'Log in', exact: true });
    this.signupLink = page.getByRole('link', { name: 'Sign up →' });
    this.getStartedButton = page.getByRole('link', { name: 'Start your assessment' });

    // Hero — typewriter headline renders inside the single h1
    this.headline = page.getByRole('heading', { level: 1 });

    // Expandable "8 IT domains covered" card (clickable div — click anywhere on it)
    this.domainsCard = page.getByText('IT domains covered');
    // The 8 domain entries revealed on expand, matched by their exact names
    this.domainCards = page.getByText(
      /^(Security|Infrastructure|Operations|Cloud & Connectivity|Data Management|Business Continuity|IT Governance|End User Computing)$/
    );

    // Product cards — anchored to their h3 headings
    this.aiReadinessCard = page.getByRole('heading', { name: 'AI Readiness Assessment' });
    this.itMaturityCard = page.getByRole('heading', { name: 'IT Maturity Assessment' });

    // Footer — scoped to <footer> so the cookie banner's Terms link never collides
    this.footer = page.getByRole('contentinfo');
    this.termsLink = this.footer.getByRole('link', { name: 'Terms & Conditions' });
    this.privacyLink = this.footer.getByRole('link', { name: 'Privacy Policy' });

    // Cookie consent
    this.cookieBanner = page.getByText(/we use cookies/i);
    this.cookieAcceptButton = page.getByRole('button', { name: 'Accept', exact: true });
    this.cookieDeclineButton = page.getByRole('button', { name: 'Decline', exact: true });
  }

  async goto() {
    await this.page.goto('/');
  }

  async expandDomains() {
    await this.domainsCard.click();
  }

  async acceptCookies() {
    if (await this.cookieBanner.isVisible()) {
      await this.cookieAcceptButton.click();
    }
  }
}
