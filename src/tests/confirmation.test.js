import assert from 'node:assert/strict';

async function runTests() {
  console.log('--- Running Confirmation Module Contract tests ---');

  // Test options normalization contract (mimicking the logic in ConfirmationContext)
  function normalizeConfirmOptions(options) {
    if (typeof options === 'string') {
      return {
        title: 'Please Confirm',
        message: options,
        description: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: null,
      };
    }
    return {
      title: options.title || 'Please Confirm',
      message: options.message || '',
      description: options.description || null,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
      icon: options.icon || null,
    };
  }

  // 1. String parameter converts cleanly to modal state
  const stringPrompt = normalizeConfirmOptions('Discard receipt from Countdown?');
  assert.equal(stringPrompt.title, 'Please Confirm');
  assert.equal(stringPrompt.message, 'Discard receipt from Countdown?');
  assert.equal(stringPrompt.variant, 'danger');
  assert.equal(stringPrompt.confirmText, 'Confirm');
  assert.equal(stringPrompt.cancelText, 'Cancel');
  console.log('✓ String prompt normalization passed');

  // 2. Object parameter preserves custom labels and variants
  const customPrompt = normalizeConfirmOptions({
    title: 'Delete Savings Goal',
    message: 'Are you sure you want to delete Emergency Fund?',
    description: 'This action cannot be undone.',
    confirmText: 'Delete Goal',
    cancelText: 'Keep Goal',
    variant: 'danger',
  });
  assert.equal(customPrompt.title, 'Delete Savings Goal');
  assert.equal(customPrompt.message, 'Are you sure you want to delete Emergency Fund?');
  assert.equal(customPrompt.description, 'This action cannot be undone.');
  assert.equal(customPrompt.confirmText, 'Delete Goal');
  assert.equal(customPrompt.cancelText, 'Keep Goal');
  assert.equal(customPrompt.variant, 'danger');
  console.log('✓ Custom object configuration normalization passed');

  // 3. Warning variant for settings removal
  const warningPrompt = normalizeConfirmOptions({
    title: 'Remove Category Limit',
    message: 'Remove Groceries limit?',
    variant: 'warning',
    confirmText: 'Remove Limit',
  });
  assert.equal(warningPrompt.variant, 'warning');
  assert.equal(warningPrompt.confirmText, 'Remove Limit');
  assert.equal(warningPrompt.cancelText, 'Cancel');
  console.log('✓ Warning variant configuration passed');

  // 4. Promise resolver contract simulation
  class ConfirmManager {
    constructor() {
      this.resolver = null;
    }
    confirm(opts) {
      return new Promise((resolve) => {
        if (this.resolver) {
          this.resolver(false);
        }
        this.resolver = resolve;
      });
    }
    onConfirm() {
      if (this.resolver) {
        this.resolver(true);
        this.resolver = null;
      }
    }
    onCancel() {
      if (this.resolver) {
        this.resolver(false);
        this.resolver = null;
      }
    }
  }

  const manager = new ConfirmManager();
  const confirmPromise = manager.confirm('Test confirm');
  manager.onConfirm();
  const resConfirm = await confirmPromise;
  assert.equal(resConfirm, true, 'Confirm action resolves to true');

  const cancelPromise = manager.confirm('Test cancel');
  manager.onCancel();
  const resCancel = await cancelPromise;
  assert.equal(resCancel, false, 'Cancel action resolves to false');

  // 5. Concurrent confirm call automatically resolves previous promise with false
  const p1 = manager.confirm('First prompt');
  const p2 = manager.confirm('Second prompt overriding first');
  manager.onConfirm(); // Confirms second prompt
  const resP1 = await p1;
  const resP2 = await p2;
  assert.equal(resP1, false, 'Previous unconfirmed promise resolves false when superseded');
  assert.equal(resP2, true, 'Active second promise resolves true upon confirm');
  console.log('✓ Concurrent invocation promise resolution passed');

  console.log('✓ Asynchronous promise resolution (confirm=true, cancel=false) passed');
  console.log('All confirmation contract tests passed!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
