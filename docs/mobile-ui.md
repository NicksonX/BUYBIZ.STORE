# Mobile UI research and decisions

The mobile experience is the primary storefront. This document records the research, the design decisions and the test matrix used for the BUYBIZ mobile pass.

## What the Nigerian device data says

Statcounter's October 2026 Nigeria mobile and tablet screen resolution data shows:

| Reported resolution | Share | Practical CSS width |
| --- | ---: | --- |
| 360x800 | 21.05% | 360px |
| 360x806 | 13.58% | 360px |
| 360x820 | 8.2% | 360px |
| 414x896 | 6.82% | 414px |
| 412x915 | 6.51% | 412px |
| 385x854 | 4.27% | 385px |

The three 360px families alone account for about 42.8% of the sample. That makes 360px the design baseline, not 390px. The 412px and 414px families add another 13.3%.

Statcounter's Nigeria mobile vendor data for the same period shows Tecno at 21.3%, Infinix at 17.43%, Samsung at 17.43%, Xiaomi at 13.72%, Apple at 13.3% and Itel at 5.52%. Tecno, Infinix and Itel together are about 44.25%. That is a strong signal to design for mid-range and low-end Android performance, not only flagship iPhones.

Sources:

- [Statcounter mobile and tablet screen resolution, Nigeria](https://gs.statcounter.com/screen-resolution-stats/mobile-tablet/nigeria/2022)
- [Statcounter mobile vendor share, Nigeria](https://gs.statcounter.com/vendor-market-share/mobile/nigeria)

## Interaction research

web.dev recommends a touch target of about 48 CSS pixels and about 8px of spacing between targets. Its guidance notes that 48px is close to the size of a finger pad and benefits users with motor impairments.

- [web.dev: Accessible tap targets](https://web.dev/articles/accessible-tap-targets)

MDN documents `env(safe-area-inset-*)`, which lets the interface avoid notches, rounded display corners and home indicators. It requires `viewport-fit=cover` in the viewport metadata.

- [MDN: CSS env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)

Mobile Safari zooms the page when a focused form field uses a font size below 16px. BUYBIZ form fields now use 16px on phones. This prevents the layout from jumping and keeps the keyboard interaction predictable.

## Device strategy

The app does not sniff user agents. It responds to viewport width and input capability, which covers more devices and ages better.

### 320px to 359px: small Android and older iPhones

- One-column content.
- Stacked plan cards instead of a clipped horizontal carousel.
- Full-width primary actions.
- No decorative hero art.
- Compact page padding.
- Type floor for tiny labels, while body copy stays at 13px to 16px.
- No horizontal overflow, verified at 320px.

### 360px to 389px: the primary Nigerian Android range

- The same single-column layout with slightly more breathing room.
- Hero headline at 38px, two lines.
- Services use a full-width live proxy card, paired coming-soon cards and a full-width roadmap card on phones. At tablet width the four cards form a balanced 2x2 grid.
- Plan cards are vertical and full width for clear price comparison.
- All pill filters and primary controls have at least a 44px touch height.
- Header CTA is 40px high with a 44px menu button.

### 390px to 430px: modern iPhone and Android

- Fluid spacing and wrapping.
- The same content order, no device-specific duplication.
- Safe-area padding for iPhone home indicators and notches.
- Forms remain at 16px to prevent Safari zoom.

### 768px to 1023px: tablets and foldables

- The hero remains copy-first, with the large access card shown from 1024px.
- Services and plan sections move to two columns.
- Navigation remains the desktop header until 1024px, where the full account actions have room.

### 1024px and above: desktop

- The access card illustration and two-column hero return.
- Plan cards sit in a three-column grid.
- Hover movement is limited to devices with a pointer.

## Implementation decisions

- `viewport-fit=cover` added to the root viewport metadata.
- `interactiveWidget: "resizes-content"` added so the virtual keyboard does not cover focused controls where the browser supports it.
- Safe-area padding added to the public header, the mobile menu and the dashboard bottom navigation.
- A 44px minimum target is applied to buttons, menu items and pill-shaped links on touch and small screens.
- Checkboxes are 20px and remain inside a larger clickable label.
- Form fields are 16px and at least 44px tall on mobile.
- The public mobile menu uses `100dvh` minus the header and safe area, instead of `100vh`.
- The bottom navigation already used `env(safe-area-inset-bottom)` and remains the primary customer navigation.
- Mobile type floor raises 8px to 10.5px labels to 11px, and 11px labels to 12.5px. This keeps dense dashboard labels readable without turning cards into walls of text.
- The hero illustration is hidden below 1024px, removing a very tall decorative block from the mobile critical path.
- The no-stock, shared-proxy and no-withdrawal notices were shortened. Full detail remains in the checkout, wallet, FAQ and Terms.
- Heavy blur, noise and the animated status ping are removed on phones and touch devices.
- The homepage navigation is now direct: Marketplace, How it works, Coming soon, Pricing and About. The generic Products, Solutions and Resources dropdowns are gone.

## Test matrix

Tested with Chromium mobile emulation during development:

| Width | Result |
| ---: | --- |
| 320px | No horizontal overflow |
| 360px | No horizontal overflow, primary target |
| 390px | No horizontal overflow |
| 412px | No horizontal overflow |
| 430px | No horizontal overflow |
| 768px | No horizontal overflow |

Customer pages checked at 360px: dashboard, marketplace, wallet, orders, proxies, support and settings. Public pages checked at 360px: home, pricing, marketplace, FAQ, how it works, about and contact.

Screenshots:

- [Mobile hero, 360px](screenshots/mobile-360-hero-v2.png)
- [Mobile services, 360px](screenshots/mobile-360-services.png)
- [Mobile services, 440px after grid fix](screenshots/mobile-440-services-v3.png)
- [Tablet services, 768px after grid fix](screenshots/tablet-768-services-v3.png)
- [Small phone hero, 320px](screenshots/mobile-320-hero-v3.png)
- [Checkout, 320px](screenshots/mobile-320-checkout-v3.png)
- [Mobile plans, 360px](screenshots/mobile-360-plans.png)
- [Customer dashboard, 360px](screenshots/mobile-360-dash-home.png)
- [Wallet, 360px](screenshots/mobile-360-dash-wallet.png)
- [Checkout, 360px](screenshots/mobile-360-dash-checkout.png)

## What still needs physical-device testing

Emulation does not catch every radio, GPU or keyboard quirk. Before launch, test at least:

1. A Tecno or Infinix device on Android Chrome over a throttled 4G connection.
2. A Samsung Galaxy A-series device.
3. An iPhone with a notch or Dynamic Island in Safari, including the software keyboard.
4. A 320px-class older Android device.
5. Landscape orientation on a small phone.
6. Reduced-motion and large-text settings at the operating system level.

The mobile code is ready for those checks, but they have not been represented as completed physical-device certification.
