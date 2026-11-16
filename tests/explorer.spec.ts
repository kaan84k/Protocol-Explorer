import { expect, test } from '@playwright/test';
import { protocols } from '../src/data/protocols';
import { PACKET_DURATION_MS } from '../src/simulation/playback';

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
  await page.clock.runFor(PACKET_DURATION_MS + 100);
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
  const time = new Date('2026-01-01T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  for (let i = 0; i < 8; i++) {
    await page.clock.fastForward(PACKET_DURATION_MS + 100);
    await expect
      .poll(async () =>
        Number(
          await page
            .getByRole('progressbar', { name: 'Lesson progress' })
            .getAttribute('aria-valuenow'),
        ),
      )
      .toBeGreaterThanOrEqual(Math.floor(((i + 1) / 8) * 100));
  }
  await expect(page.getByText('LESSON COMPLETE', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay lesson' })).toBeVisible();
  await page.getByRole('button', { name: 'A How routers choose the next hop' }).click();
  await expect(page.locator('.quiz-feedback')).toContainText('Try again');
  await page
    .getByRole('button', { name: 'B The format and meaning of requests and responses' })
    .click();
  await expect(page.locator('.quiz-feedback')).toContainText('Exactly');
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
  await page.getByRole('button', { name: 'Follow packet', exact: true }).click();
  await expect(page.getByLabel('Zoom level')).toHaveText('170%');
  await expect(page.getByLabel('Packet progress', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
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

test('packet motion starts at its sender and preserves position through pause, resume, and speed changes', async ({
  page,
}) => {
  await page.goto('/?protocol=http');
  const time = new Date('2026-01-01T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.clock.runFor(10000);
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  const packet = page.locator('.moving-packet');
  await expect(packet).toHaveAttribute('data-status', 'preparing');
  await expect(packet).toHaveAttribute('data-route-progress', '0.00000');
  const source = await packet.getAttribute('transform');
  await expect(page.locator('.journey-message')).toContainText('DNS query: example.com (IPv4)');
  await expect(page.locator('.packet-explanation')).toContainText(
    'An A-record question asks for an IPv4 address',
  );
  await page.clock.runFor(1600);
  await expect(packet).not.toHaveAttribute('transform', source!);
  await page.getByRole('button', { name: 'Pause lesson' }).click();
  const paused = await packet.getAttribute('transform');
  const progress = Number(await packet.getAttribute('data-progress'));
  await page.clock.runFor(9000);
  await expect(packet).toHaveAttribute('transform', paused!);
  await expect(packet).toBeVisible();
  await page.getByRole('button', { name: 'Play lesson', exact: true }).click();
  await page.clock.runFor(480);
  expect(Number(await packet.getAttribute('data-progress'))).toBeCloseTo(progress + 0.1, 1);
  await page.getByLabel('Playback speed').selectOption('2');
  const beforeSpeed = Number(await packet.getAttribute('data-progress'));
  await page.clock.runFor(480);
  expect(Number(await packet.getAttribute('data-progress'))).toBeCloseTo(beforeSpeed + 0.2, 1);
  await page.getByRole('button', { name: 'Pause lesson' }).click();
  await page.getByRole('button', { name: 'Sequence', exact: true }).click();
  await page.getByRole('button', { name: 'Network', exact: true }).click();
  expect(Number(await packet.getAttribute('data-progress'))).toBeCloseTo(beforeSpeed + 0.2, 1);
  await page.getByRole('button', { name: 'Next packet', exact: true }).click();
  await expect(packet).toHaveAttribute('data-packet-index', '1');
  await expect(packet).toHaveAttribute('data-route-progress', '0.00000');
});

test('zoom, follow, pan, fit, and scrubbing keep the diagram and narration in sync', async ({
  page,
}) => {
  await page.goto('/?protocol=http');
  await page.getByRole('button', { name: 'Go to step 1: Resolve the address' }).click();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByLabel('Zoom level')).toHaveText('125%');
  const world = page.locator('.camera-world');
  const beforePan = await world.getAttribute('style');
  const canvas = page.getByRole('region', { name: /^Network canvas/ });
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(world).not.toHaveAttribute('style', beforePan!);
  await expect(page.locator('.moving-packet')).toHaveAttribute('data-packet-index', '0');
  const beforeDrag = await world.getAttribute('style');
  const svg = await page.locator('.network-svg').boundingBox();
  await page.mouse.move(svg!.x + svg!.width / 2, svg!.y + svg!.height / 2);
  await page.mouse.down();
  await page.mouse.move(svg!.x + svg!.width / 2 + 80, svg!.y + svg!.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  await expect(world).not.toHaveAttribute('style', beforeDrag!);
  await page.getByRole('button', { name: 'Follow packet', exact: true }).click();
  await expect(page.getByLabel('Zoom level')).toHaveText('170%');
  const startCamera = await world.getAttribute('style');
  await page.getByRole('button', { name: 'Examine arrive stage' }).click();
  await expect(page.locator('.moving-packet')).toHaveAttribute('data-status', 'arrived');
  await expect(page.locator('.journey-now')).toContainText('receives the message');
  await expect(world).not.toHaveAttribute('style', startCamera!);
  const scrubber = page.getByRole('slider', { name: 'Packet progress', exact: true });
  await scrubber.fill('30');
  await expect(page.locator('.moving-packet')).toHaveAttribute('data-progress', '0.30000');
  await expect(page.locator('.journey-now')).toContainText('sends the packet toward');
  await expect(page.getByRole('button', { name: 'Play lesson', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fit entire network' }).click();
  await expect(page.getByLabel('Zoom level')).toHaveText('100%');
  await expect(world).toHaveAttribute('data-zoom', '1');
  await page.getByRole('button', { name: 'Open current packet details' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('loss and reduced-motion modes show the correct packet state', async ({ page }) => {
  await page.goto('/?protocol=udp');
  await page.getByRole('button', { name: 'Go to step 2: Continue the stream' }).click();
  await page.getByRole('button', { name: 'Next packet', exact: true }).click();
  await page.getByRole('button', { name: 'Examine drop stage' }).click();
  await expect(page.locator('.moving-packet')).toHaveAttribute('data-status', 'dropped');
  await expect(page.locator('.moving-packet')).toHaveAttribute('data-route-progress', '0.68000');
  await expect(page.locator('.journey-now')).toContainText('does not reach its destination');
  await expect(page.locator('.packet-explanation')).toContainText(
    'no built-in acknowledgment or retransmission',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Examine prepare stage' }).click();
  const source = await page.locator('.moving-packet').getAttribute('transform');
  await page.getByRole('slider', { name: 'Packet progress', exact: true }).fill('60');
  await expect(page.locator('.moving-packet')).toHaveAttribute('transform', source!);
  await page.getByRole('button', { name: 'Examine drop stage' }).click();
  await expect(page.locator('.moving-packet')).not.toHaveAttribute('transform', source!);
  await expect(page.locator('.camera-world')).toHaveCSS('transition-duration', '0s');
});
