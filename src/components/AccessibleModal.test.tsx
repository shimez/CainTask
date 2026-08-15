import { fireEvent, render, screen } from '@testing-library/react';
import { AccessibleModal } from './AccessibleModal';

describe('AccessibleModal', () => {
  it('exposes dialog semantics and closes with Escape', () => {
    const onClose = jest.fn();
    render(
      <AccessibleModal titleId="dialog-title" onClose={onClose}>
        <h2 id="dialog-title">設定</h2>
        <button>保存</button>
      </AccessibleModal>
    );

    expect(screen.getByRole('dialog', { name: '設定' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: '保存' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
