/**
 * Bottom tab bar geometry — shared by the Tabs layout (which sizes the bar)
 * and Calendar (which positions the FAB/agenda around it).
 *
 * React Navigation's uikit bar is `49 + insets.bottom` tall with
 * `paddingBottom: insets.bottom` and top-justified items — on a
 * home-indicator iPhone that's a ~34pt dead glass strip under the icons,
 * so the whole bar reads as floating too high.
 *
 * We split the shrunken inset: a small TOP pad pushes the icon/label row
 * down inside the bar, and a reduced BOTTOM pad keeps the labels a safe
 * distance above the home indicator. Bar total height shrinks by the
 * difference, anchoring it visually to the screen bottom.
 */

/** UIKit tab-band height (icon + label row) — unchanged from RN's default. */
export const TAB_BAR_CONTENT_HEIGHT = 49;

/** Points shaved off the bottom safe-area inset (dead glass under labels). */
const BAR_LIFT = 20;

/** Extra top padding inside the bar — nudges icons/labels down together. */
export const TAB_BAR_TOP_PAD = 8;

/** Bottom padding inside the bar — ~14pt clearance under the labels on
 *  34pt-inset devices (the home indicator floats over the glass, as in
 *  native iOS tab bars) with an 8pt floor for devices without one. */
export function tabBarBottomInset(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom - BAR_LIFT, 8);
}

/** Total rendered bar height: top pad + content band + shrunken bottom pad. */
export function tabBarTotalHeight(safeAreaBottom: number): number {
  return TAB_BAR_TOP_PAD + TAB_BAR_CONTENT_HEIGHT + tabBarBottomInset(safeAreaBottom);
}

/** How much of the bar overlaps scene content above the safe-area line —
 *  the clearance screens must leave when the container already consumes
 *  the bottom inset (e.g. SafeAreaView edges={['bottom']}). */
export function tabBarContentOverlay(safeAreaBottom: number): number {
  return Math.max(tabBarTotalHeight(safeAreaBottom) - safeAreaBottom, 0);
}
