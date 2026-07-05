// pages/AIReadinessPage.js
// Covers the full post-payment assessment flow:
// /dashboard/products/ai-readiness → assess → results/[id]
import { expect } from '@playwright/test';

const SECTION_TITLES =
  /^(Technology Foundation|Data & Storage|AI Readiness|Security & Access|Strategy & Governance)$/;

// Anchored to exact nav/control button labels so option labels containing
// common words (e.g. "Submit your tools") are not accidentally filtered out.
const NON_OPTION_BUTTONS =
  /^(← Previous|Next section →|Submit & view results →|Saving results\.\.\.|Mark as N\/A|✕ Remove N\/A)$/;

export class AIReadinessPage {
  constructor(page) {
    this.page = page;

    // Product detail page
    this.purchaseButton = page.getByRole('button', { name: /^purchase/i });
    this.priceBadge = page.getByText(/NZD/).first();

    // Assessment page — section tabs render as "{icon} {title}" chips
    this.sectionTabs = page.getByText(/^\S+ (Software & Licensing|Data & Storage|AI Readiness|Security & Access|Strategy & Governance)$/);
    this.sectionHeading = page.getByRole('heading', { level: 1 });
    // Answer options are plain buttons — everything except the nav/submit buttons
    this.optionButtons = page
      .locator('xpath=//button[not(ancestor::nav)]')
      .filter({ hasNotText: NON_OPTION_BUTTONS });
    this.prevButton = page.getByRole('button', { name: '← Previous' });
    this.nextButton = page.getByRole('button', { name: /next section/i });
    this.submitButton = page.getByRole('button', { name: /submit & view results/i });
    this.termsCheckbox = page.getByRole('checkbox');
    this.progressBar = page.getByRole('progressbar');

    // Results page
    this.scoreRing = page.getByTestId('ai-score-ring');
    this.readinessLevel = page.getByTestId('ai-readiness-level');
    this.recommendations = page.getByTestId('recommendation-item');
    this.downloadPdfButton = page.getByTestId('download-pdf-btn');
    this.aiCommentarySection = page.getByTestId('ai-commentary');
    // Only rendered when cached commentary is missing (Retry / Regenerate)
    this.generateCommentaryButton = page.getByRole('button', { name: /retry|regenerate/i });
    // Domain breakdown rows, matched by their exact section titles
    this.domainBars = page.getByText(SECTION_TITLES);
  }

  async gotoProductPage() {
    await this.page.goto('/dashboard/products/ai-readiness');
  }

  async gotoAssessPage(assessmentId) {
    const query = assessmentId ? `?assessment_id=${assessmentId}` : '';
    await this.page.goto(`/dashboard/products/ai-readiness/assess${query}`);
    await this.skipEnvironmentStep();
  }

  /**
   * The AI Readiness assess page now shows an Environment step before questions.
   * Click "Continue to assessment →" to get past it.
   *
   * Waits for the progress counter ("0 / N answered") as the ready signal —
   * it only appears once questions are mounted, not during the env step or
   * the transient "Saving..." state.
   *
   * Safe to call even when the env step is absent (error state, no assessmentId).
   */
  async skipEnvironmentStep() {
    const continueBtn = this.page.getByRole('button', { name: /continue to assessment/i });
    try {
      await continueBtn.waitFor({ state: 'visible', timeout: 8_000 });
      await continueBtn.click();
      // Progress counter only renders once questions are loaded — not on the env step
      await this.page.getByText(/\d+ \/ \d+ answered/).waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      // Env step not present (error page or already past it) — proceed
    }
  }

  /**
   * Answers every question in the current section.
   * Options within one question are mutually exclusive and the last click
   * wins, so clicking all options in document order selects each question's
   * LAST option ('max'), and clicking in reverse order selects its FIRST.
   */
  async answerCurrentSection(strategy = 'first') {
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
    const maxSections = 10; // safety bound — the assessment has 5 sections
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
