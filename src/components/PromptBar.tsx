import type { PendingPrompt, CardId, Action } from '../../party/types';

interface Props {
  prompt: PendingPrompt;
  selectedCardIds: CardId[];
  onAction: (action: Action) => void;
  onClearSelection: () => void;
}

function promptText(prompt: PendingPrompt): string {
  switch (prompt.kind) {
    case 'discardAny':
      if (prompt.min > 0) return `Discard exactly ${prompt.min} card(s) to satisfy Price War.`;
      return `Select cards to discard, then confirm. You'll redraw the same number.`;
    case 'chooseCardToTrash':
      return prompt.filter === 'Revenue'
        ? 'Choose a Revenue card in your hand to trash.'
        : 'Choose a card in your hand to trash.';
    case 'chooseCardToGain':
      return prompt.filter === 'Revenue'
        ? `Choose a Revenue card costing up to $${prompt.maxCost} to gain to hand.`
        : `Choose a card costing up to $${prompt.maxCost} to gain.`;
    case 'reactToAttack':
      return 'Discard down to 3 cards.';
    default:
      return '';
  }
}

const btnStyle = (variant: 'primary' | 'ghost') => {
  const base = {
    fontFamily: '"Space Mono", monospace',
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const,
    padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
    fontWeight: 700, transition: 'all 0.15s ease', border: 'none' as const,
  };
  if (variant === 'primary') return { ...base, background: '#5b8def', color: '#0a0c12' };
  return { ...base, background: 'transparent', color: '#8a92a8', border: '1px solid #2a3142' };
};

export function PromptBar({ prompt, selectedCardIds, onAction, onClearSelection }: Props) {
  const isDiscardAny = prompt.kind === 'discardAny';
  const isGainStep = prompt.kind === 'chooseCardToGain';

  function handleConfirm() {
    if (isDiscardAny) {
      onAction({ kind: 'promptResponse', choice: { kind: 'discardAny', cardIds: selectedCardIds } });
      onClearSelection();
    }
  }

  function handleCancel() {
    onAction({ kind: 'promptResponse', choice: { kind: 'cancelPrompt' } });
    onClearSelection();
  }

  return (
    <div style={{
      margin: '12px 0',
      padding: '12px 16px',
      background: 'linear-gradient(to right, #1d2030, #161a24)',
      border: '1px solid #5b8def',
      borderRadius: 8,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 0 20px -8px #5b8def88',
    }}>
      <div style={{ color: '#a8c4ff', fontSize: 13 }}>
        <span style={{ color: '#5b8def', fontWeight: 700, marginRight: 10 }}>►</span>
        {promptText(prompt)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {isDiscardAny && (
          <button onClick={handleConfirm} style={btnStyle('primary')}>
            Confirm ({selectedCardIds.length})
          </button>
        )}
        {(isGainStep || isDiscardAny) && (
          <button onClick={handleCancel} style={btnStyle('ghost')}>
            {isGainStep ? 'Skip' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
