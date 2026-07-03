// utils/stripe.js
// Helpers for completing Stripe Checkout in test mode.
// The app redirects to Stripe's HOSTED checkout page (checkout.stripe.com),
// which renders plain named inputs — no Elements iframes.

/**
 * Fills the Stripe hosted checkout card form with the given card number
 * and submits. Assumes page is on (or redirecting to) checkout.stripe.com.
 * Selectors below belong to Stripe's page, not the app.
 */
export async function fillStripeCheckout(page, cardNumber) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

  const cardField = page.locator('input[name="cardNumber"]');
  await cardField.waitFor({ timeout: 15_000 });

  // Email is prefilled from the Checkout session when available
  const emailField = page.locator('input[name="email"]');
  if (await emailField.isVisible() && !(await emailField.inputValue())) {
    await emailField.fill(process.env.TEST_USER_EMAIL);
  }

  await cardField.fill(cardNumber);
  await page.locator('input[name="cardExpiry"]').fill(process.env.STRIPE_TEST_EXPIRY || '12/26');
  await page.locator('input[name="cardCvc"]').fill(process.env.STRIPE_TEST_CVC || '123');

  const billingName = page.locator('input[name="billingName"]');
  if (await billingName.isVisible()) {
    await billingName.fill('Playwright Test');
  }

  await page.getByTestId('hosted-payment-submit-button').click();
}

/**
 * Completes a Stripe Checkout session with the standard success test card
 * and waits for the redirect back to the app.
 */
export async function completeStripeCheckout(page) {
  await fillStripeCheckout(page, process.env.STRIPE_TEST_CARD || '4242424242424242');
  await page.waitForURL(/angleyou\.com/, { timeout: 30_000 });
}
