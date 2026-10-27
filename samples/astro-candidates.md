# Synthetic Astro candidate fixtures

These are bounded shakedown fixtures, not official samples or a declaration of
App Service Builder's supported framework/version matrix.

Both pin Astro 7.4.1 and select Node.js 24. Static output uses the documented
generic static-toolchain manifest. SSR pins `@astrojs/node` 11.1.9 in standalone
mode, follows Astro's public Node adapter guidance, and uses the documented
generic Node HTTP manifest. Sessions are disabled; all content is synthetic.

The static fixture has generated root/about pages plus CSS, JavaScript and
health files. The SSR fixture has per-request nonce rendering, an API response,
CSS, JavaScript and a health route. No external service, secret, persistent
storage or user data is used.
