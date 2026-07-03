// pages/OnboardingPage.js
export class OnboardingPage {
  constructor(page) {
    this.page = page;

    // Personal details (no testids — anchored by placeholder text)
    this.fullNameInput = page.getByPlaceholder('Jane Smith');
    this.positionInput = page.getByPlaceholder('IT Manager');
    this.phoneInput = page.getByPlaceholder('+64 21 000 0000');

    // Organisation details
    this.orgNameInput = page.getByTestId('org-name-input');
    this.orgSizeSelect = page.getByTestId('org-size-select');
    this.domainInput = page.getByTestId('domain-input');
    // Industry select has no testid — distinguish from the size select by its placeholder option
    this.industrySelect = page.getByRole('combobox').filter({ hasText: 'Select industry' });

    // Account type is a pair of clickable option cards, not radio inputs
    this.accountTypeOptions = {
      single: page.getByText('Single Company', { exact: true }),
      msp: page.getByText('MSP / Consultant', { exact: true }),
    };

    this.continueButton = page.getByTestId('onboarding-submit');
  }

  async goto() {
    await this.page.goto('/onboarding');
  }

  async selectAccountType(accountType) {
    await this.accountTypeOptions[accountType].click();
  }

  /**
   * Flow helper: fills every required onboarding field and submits.
   * Full name, position, and industry are required by the form, so
   * they get sensible defaults when not provided.
   */
  async complete({
    orgName,
    orgSize = '11-50',
    domain = '',
    accountType = 'single',
    fullName = 'Test User',
    position = 'IT Manager',
    industry = null,
  } = {}) {
    await this.fullNameInput.fill(fullName);
    await this.positionInput.fill(position);
    await this.selectAccountType(accountType);
    await this.orgNameInput.fill(orgName);
    await this.orgSizeSelect.selectOption(orgSize);
    if (industry) {
      await this.industrySelect.selectOption(industry);
    } else {
      // First real option after the "Select industry..." placeholder
      await this.industrySelect.selectOption({ index: 1 });
    }
    if (domain) await this.domainInput.fill(domain);
    await this.continueButton.click();
    await this.page.waitForURL('/dashboard', { timeout: 10_000 });
  }
}
