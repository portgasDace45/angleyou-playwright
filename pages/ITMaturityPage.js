// pages/ITMaturityPage.js
// Covers the freemium IT Maturity flow:
// /dashboard/products/it-maturity → assess → results/[id]
import { expect } from '@playwright/test';

// Anchored to exact nav/control button labels so option labels containing
// common words (e.g. "Submit your backup plan") are not accidentally filtered out.
const NON_OPTION_BUTTONS =
  /^(← Previous|Next section →|Get my free results →|Submit & view full results →|Saving results\.\.\.|Mark as N\/A|✕ Remove N\/A)$/;

export class ITMaturityPage {
  constructor(page) {
    this.page = page;

    // Product detail page — testid button on first run, role-named on reassess
    this.startFreeButton = page
      .getByTestId('itm-start-free-btn')
      .or(page.getByRole('button', { name: /reassess|assess this client/i }));

    // Assessment page
    this.sectionHeading = page.getByRole('heading', { level: 1 });
    // XPath excludes buttons inside any <nav> (catches the DarkNav avatar button
    // and any other nav controls that would otherwise be the first match).
    this.optionButtons = page
      .locator('xpath=//button[not(ancestor::nav)]')
      .filter({ hasNotText: NON_OPTION_BUTTONS });
    this.prevButton = page.getByRole('button', { name: '← Previous' });
    this.nextButton = page.getByRole('button', { name: /next section/i });
    this.submitButton = page.getByRole('button', {
      name: /get my free results|submit & view full results/i,
    });
    this.termsCheckbox = page.getByRole('checkbox');
    this.progressBar = page.getByRole('progressbar');

    // Results page
    this.overallScore = page.getByTestId('itm-overall-score');
    this.maturityLevel = page.getByTestId('itm-maturity-level');
    // Both upgrade CTAs share the itm-upgrade-btn testid; only one renders
    // per tier, distinguished here by label
    this.upgradeButton = page.getByTestId('itm-upgrade-btn');
    this.upgradeToScoresButton = this.upgradeButton.filter({ hasText: /unlock/i });
    this.upgradeToFullButton = this.upgradeButton.filter({ hasText: /full report|upgrade/i });

    // DNS Security Check (auto-loaded on results page)
    this.dnsCheckSection = page.getByText('Email Security Check');
  }

  async gotoProductPage() {
    await this.page.goto('/dashboard/products/it-maturity');
  }

  /** The assess page requires an assessment_id query param to load questions. */
  async gotoAssessPage(assessmentId) {
    const query = assessmentId ? `?assessment_id=${assessmentId}` : '';
    await this.page.goto(`/dashboard/products/it-maturity/assess${query}`);
  }

  async startFreeAssessment() {
    await this.startFreeButton.click();
    await this.page.waitForURL(/\/assess/);
  }

  /**
   * Answers every question in the current section.
   * Options within one question are mutually exclusive and the last click
   * wins, so clicking all options in document order selects each question's
   * LAST option ('max'), and clicking in reverse order selects its FIRST.
   */
  async answerCurrentSection(strategy = 'first') {
    // Wait for at least one option button to appear, then snapshot the full list.
    // .all() freezes the match set so concurrent DOM mutations don't shift indices.
    await this.optionButtons.first().waitFor({ state: 'visible' });
    const buttons = await this.optionButtons.all();
    const ordered = strategy === 'max' ? buttons : [...buttons].reverse();
    for (const btn of ordered) {
      await btn.click();
    }
  }

  /** Advances one section and waits for the section heading to change. */
  async goToNextSection() {
    const currentTitle = await this.sectionHeading.textContent();
    await this.nextButton.click();
    await expect(this.sectionHeading).not.toHaveText(currentTitle);
  }

  async acceptTerms() {
    await this.termsCheckbox.check();
  }

  /** Submits the final section once the CAPTCHA has enabled the button. */
  async submitAssessment() {
    await expect(this.submitButton).toBeEnabled({ timeout: 20_000 });
    await this.submitButton.click();
  }

  /**
   * Flow helper: answers all questions section by section and submits.
   * Pass `strategy: 'max'` to always pick the highest-score option.
   */
  async answerAllQuestions(strategy = 'first') {
    const maxSections = 12; // safety bound — the assessment has 8 sections
    for (let section = 0; section < maxSections; section++) {
      await this.answerCurrentSection(strategy);
      if (await this.submitButton.isVisible()) {
        await this.acceptTerms();
        await this.submitAssessment();
        return;
      }
      await this.goToNextSection();
    }
    throw new Error('answerAllQuestions: submit button never appeared');
  }

  async waitForResults() {
    await this.page.waitForURL(/\/results\/[a-z0-9-]+/, { timeout: 20_000 });
  }
}
