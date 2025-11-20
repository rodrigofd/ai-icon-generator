import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  title?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, id, title }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      id={id}
      title={title}
      className={`relative inline-flex h-[26px] w-[46px] flex-shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2`}
      style={{
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
      }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-[2px] ml-[2px]`}
        style={{
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
};

export default Switch;