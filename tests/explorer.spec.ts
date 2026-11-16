import { expect, test } from '@playwright/test';
import { protocols } from '../src/data/protocols';

test('initial explorer renders without errors and supports playback, pausing, stepping, and reset', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'HTTP', exact: true })).toBeVisible();
  await expect(page.getByLabel('Packet flow').locator('tbody tr')).toHaveCount(7);
  await page.clock.install();
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause lesson' })).toBeVisible();
  await expect(page.getByLabel('Packet flow').locator('tbody tr')).toHaveCount(1);
  await page.clock.runFor(2300);
  await expect(page.getByLabel('Packet flow').locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Pause lesson' }).click();
  await page.clock.runFor(6000);
  await expect(page.getByLabel('Packet flow').locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Open a connection', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset lesson' }).click();
  await expect(page.getByText('THE BIG PICTURE')).toBeVisible();
  expect(errors).toEqual([]);
});

test('all protocols render a working lesson, sequence view, and packet inspector', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const protocol of protocols) {
    await page
      .locator('.protocol-item')
      .filter({
        has: page.locator('strong', {
          hasText: new RegExp(`^${protocol.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
        }),
      })
      .click();
    await expect(page.getByRole('heading', { name: protocol.name, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`protocol=${protocol.id}$`));
    await page.getByRole('button', { name: 'Sequence', exact: true }).click();
    await expect(
      page.getByRole('img', { name: `${protocol.name} sequence diagram` }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Inspect packet 1', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Packet inspector' })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'Network', exact: true }).click();
    await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause lesson' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause lesson' }).click();
  }
  expect(errors).toEqual([]);
});

test('search, categories, empty results, and shortcuts work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox', { name: 'Search protocols' })).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search protocols' }).fill('zzzz');
  await expect(page.getByText('No matching protocols')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Filter protocol category').selectOption('Security');
  await expect(page.locator('.protocol-item')).toHaveCount(2);
  await page.getByLabel('Filter protocol category').selectOption('All');
  await page.getByRole('searchbox', { name: 'Search protocols' }).fill('TCP');
  await expect(page.locator('.protocol-item')).toHaveCount(2);
  await page
    .locator('.protocol-item')
    .filter({ has: page.locator('strong', { hasText: /^TCP$/ }) })
    .click();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause lesson' })).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Send numbered bytes' })).toBeVisible();
  await page.keyboard.press('v');
  await expect(page.getByRole('img', { name: 'TCP sequence diagram' })).toBeVisible();
});

test('completed lessons and quiz results persist after reload', async ({ page }) => {
  await page.goto('/?protocol=http');
  await page.clock.install();
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  for (let i = 0; i < 8; i++) await page.clock.runFor(2300);
  await expect(page.getByText('LESSON COMPLETE', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay lesson' })).toBeVisible();
  await page.getByRole('button', { name: 'A How routers choose the next hop' }).click();
  await expect(page.getByRole('status')).toContainText('Try again');
  await page
    .getByRole('button', { name: 'B The format and meaning of requests and responses' })
    .click();
  await expect(page.getByRole('status')).toContainText('Exactly');
  await page.reload();
  await expect(page.locator('.completed-label')).toContainText('Explored');
  await page.getByRole('button', { name: 'Learning path', exact: true }).first().click();
  await expect(
    page.getByText('1 of 20 lessons completed · 1 knowledge checks passed'),
  ).toBeVisible();
});

test('advanced mode, theme, inspector navigation, export, and glossary work', async ({ page }) => {
  await page.goto('/?protocol=https');
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Port', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Inspect packet 1', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('PACKET 02 · STEP 1')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('https-lesson-trace.json');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Advanced', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Reference', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Search reference' }).fill('TTL');
  await expect(page.getByRole('heading', { name: 'TTL', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Protocol reference' }).click();
  await page.getByRole('textbox', { name: 'Search reference' }).fill('SSH');
  await page.getByRole('button', { name: 'Explore SSH' }).click();
  await expect(page.getByRole('heading', { name: 'SSH', exact: true })).toBeVisible();
});

test('deep links, history, corrupt storage, and reduced motion are handled', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pe:progress', '{"completed":4}');
    localStorage.setItem('pe:theme', '"unexpected"');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?protocol=unknown');
  await expect(page.getByRole('heading', { name: 'HTTP', exact: true })).toBeVisible();
  await page
    .locator('.protocol-item')
    .filter({ has: page.locator('strong', { hasText: /^HTTPS$/ }) })
    .click();
  await expect(page.getByRole('heading', { name: 'HTTPS', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'HTTP', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  await expect(page.locator('animateMotion')).toHaveCount(0);
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Keyboard shortcuts' })).toBeFocused();
});

test('mobile layout has no horizontal page overflow and supports navigation and lessons', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open protocol library' }).click();
  await page.getByRole('searchbox', { name: 'Search protocols' }).fill('UDP');
  await page.locator('.protocol-item').click();
  await expect(page.getByRole('heading', { name: 'UDP', exact: true })).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Protocol library', exact: true }),
  ).not.toHaveClass(/open/);
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause lesson' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause lesson' }).click();
  await page.getByRole('button', { name: 'Go to step 3: Handle the loss in the app' }).click();
  await expect(page.getByRole('heading', { name: 'Handle the loss in the app' })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect packet 1', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Learning path', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Start with the web' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
