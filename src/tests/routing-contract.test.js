import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { getRouterBasename } from '../utils/routeUtils.js';

function DummyPage({ name }) {
  return React.createElement('div', { 'data-testid': name }, name);
}

function DummyApp() {
  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: '/', element: React.createElement(DummyPage, { name: 'dashboard' }) }),
    React.createElement(Route, { path: '/subscriptions', element: React.createElement(DummyPage, { name: 'subscriptions' }) }),
    React.createElement(Route, { path: '/breakdown', element: React.createElement(DummyPage, { name: 'breakdown' }) }),
    React.createElement(Route, { path: '/savings', element: React.createElement(DummyPage, { name: 'savings' }) }),
    React.createElement(Route, { path: '/settings', element: React.createElement(DummyPage, { name: 'settings' }) }),
    React.createElement(Route, { path: '/investments', element: React.createElement(DummyPage, { name: 'investments' }) }),
    React.createElement(Route, { path: '/notifications', element: React.createElement(DummyPage, { name: 'notifications' }) }),
    React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/', replace: true }) }),
  );
}

async function runTests() {
  console.log('--- Running Routing & Basename Contract tests ---');

  // 1. Basename normalization unit tests
  console.log('\n▸ Basename Normalization Contract');
  assert.equal(getRouterBasename('/'), '/', 'Root slash remains /');
  assert.equal(getRouterBasename(''), '/', 'Empty string defaults to /');
  assert.equal(getRouterBasename(undefined), '/', 'Undefined defaults to /');
  assert.equal(getRouterBasename(null), '/', 'Null defaults to /');
  assert.equal(getRouterBasename('   '), '/', 'Whitespace string defaults to /');
  assert.equal(
    getRouterBasename('/financial-management/'),
    '/financial-management',
    'Trailing slash stripped from GitHub Pages repository path',
  );
  assert.equal(
    getRouterBasename('/financial-management'),
    '/financial-management',
    'Path without trailing slash preserved',
  );
  assert.equal(
    getRouterBasename('/financial-management///'),
    '/financial-management',
    'Multiple trailing slashes safely collapsed',
  );
  assert.equal(
    getRouterBasename('/nested/repo/path/'),
    '/nested/repo/path',
    'Multi-level subpaths supported',
  );
  console.log('  ✓ All basename normalization tests passed');

  // 2. React Router Route Matching with GitHub Pages repository basename
  console.log('\n▸ Route Matching Contract under GitHub Pages Basename (/financial-management)');
  const basename = getRouterBasename('/financial-management/');

  // Initial entry with trailing slash
  const htmlRootSlash = ReactDOMServer.renderToString(
    React.createElement(
      MemoryRouter,
      { basename, initialEntries: ['/financial-management/'] },
      React.createElement(DummyApp),
    ),
  );
  assert.match(htmlRootSlash, /data-testid="dashboard"/, 'Matches Dashboard on /financial-management/');

  // Initial entry without trailing slash
  const htmlRootNoSlash = ReactDOMServer.renderToString(
    React.createElement(
      MemoryRouter,
      { basename, initialEntries: ['/financial-management'] },
      React.createElement(DummyApp),
    ),
  );
  assert.match(htmlRootNoSlash, /data-testid="dashboard"/, 'Matches Dashboard on /financial-management (no slash)');

  // Subroutes
  const subroutes = ['subscriptions', 'breakdown', 'savings', 'settings', 'investments', 'notifications'];
  for (const route of subroutes) {
    const htmlSubroute = ReactDOMServer.renderToString(
      React.createElement(
        MemoryRouter,
        { basename, initialEntries: [`/financial-management/${route}`] },
        React.createElement(DummyApp),
      ),
    );
    assert.match(htmlSubroute, new RegExp(`data-testid="${route}"`), `Matches /financial-management/${route}`);
  }
  console.log('  ✓ Root and all subroutes resolve accurately under basename');

  // 3. Navigation link generation contract (verifying issue #7 fix)
  console.log('\n▸ Link Generation Contract (Preserves Repository Prefix)');
  const navHtml = ReactDOMServer.renderToString(
    React.createElement(
      MemoryRouter,
      { basename, initialEntries: ['/financial-management/'] },
      React.createElement(
        'nav',
        null,
        React.createElement(Link, { to: '/' }, 'Dashboard'),
        React.createElement(Link, { to: '/subscriptions' }, 'Subscriptions'),
        React.createElement(Link, { to: '/breakdown' }, 'Breakdown'),
      ),
    ),
  );

  // Crucial invariant for Issue #7: Dashboard link MUST NOT point to root "/"
  assert.match(
    navHtml,
    /href="\/financial-management"/,
    'Dashboard link retains repository subpath and does NOT cut to "/"',
  );
  assert.doesNotMatch(
    navHtml,
    /<a [^>]*href="\/"[^>]*>Dashboard<\/a>/,
    'Dashboard link must never cut off repository prefix to "/"',
  );
  assert.match(
    navHtml,
    /href="\/financial-management\/subscriptions"/,
    'Subscriptions link retains repository prefix',
  );
  assert.match(
    navHtml,
    /href="\/financial-management\/breakdown"/,
    'Breakdown link retains repository prefix',
  );
  console.log('  ✓ Links preserve repository prefix without cutting off to root domain');

  // 4. Local development mode contract (basename = '/')
  console.log('\n▸ Local Development Contract (basename = "/")');
  const devBasename = getRouterBasename('/');
  const devNavHtml = ReactDOMServer.renderToString(
    React.createElement(
      MemoryRouter,
      { basename: devBasename, initialEntries: ['/'] },
      React.createElement(
        'nav',
        null,
        React.createElement(Link, { to: '/' }, 'Dashboard'),
        React.createElement(Link, { to: '/breakdown' }, 'Breakdown'),
      ),
    ),
  );
  assert.match(devNavHtml, /href="\/"[^>]*>Dashboard<\/a>/, 'Dev mode Dashboard link renders href="/"');
  assert.match(devNavHtml, /href="\/breakdown"/, 'Dev mode Breakdown link renders href="/breakdown"');
  console.log('  ✓ Local dev mode routes and links resolve cleanly at root "/"');

  console.log('\nAll routing contract tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
