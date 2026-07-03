// pages/GatePage.js
export class GatePage {
  constructor(page) {
    this.page = page;
    this.passwordInput = page.getByTestId('gate-password-input');
    this.submitButton = page.getByTestId('gate-submit-btn');
    this.errorMessage = page.getByTestId('gate-error');
  }

  async goto() {
    await this.page.goto('/gate');
  }

  async enterPassword(password) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  /**
   * Flow helper: navigate to the gate and submit a password.
   * Does not wait for redirect — a wrong password stays on /gate,
   * so callers assert the outcome themselves.
   */
  async unlock(password) {
    await this.goto();
    await this.enterPassword(password);
    await this.submit();
  }
}
