import React, { Children, isValidElement, useId, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';

type CardProps = {
  title?: string;
  icon?: string;
  children?: ReactNode;
};

export function Card(props: CardProps) {
  const { title, icon, children } = props;
  return (
    <section className="su8-card su8-card--feature">
      {(title || icon) && (
        <header className="su8-card__header">
          {icon ? (
            <span className="su8-card__icon" aria-hidden="true">
              <Icon icon={icon} width={18} height={18} />
            </span>
          ) : null}
          {title ? <div className="su8-card__title">{title}</div> : null}
        </header>
      )}
      <div className="su8-card__body">{children}</div>
    </section>
  );
}

export function CardGrid(props: { children?: ReactNode }) {
  return <div className="su8-card-grid">{props.children}</div>;
}

export function Steps(props: { children?: ReactNode }) {
  return <div className="su8-steps">{props.children}</div>;
}

type TabItemProps = {
  label: string;
  children?: ReactNode;
};

export function TabItem(_props: TabItemProps) {
  return null;
}

export function Tabs(props: { children?: ReactNode; defaultTab?: string }) {
  const tabId = useId();
  const items = useMemo(() => {
    return Children.toArray(props.children)
      .filter((child) => isValidElement(child) && child.type === TabItem)
      .map((child) => child as React.ReactElement<TabItemProps>);
  }, [props.children]);

  const labels = items.map((item) => item.props.label);
  const initialActive = Math.max(0, props.defaultTab ? labels.indexOf(props.defaultTab) : 0);
  const [active, setActive] = useState(initialActive);

  if (!items.length) return null;

  return (
    <div className="su8-tabs">
      <div className="su8-tabs__list" role="tablist" aria-label="Tabs">
        {items.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={item.props.label}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? 'su8-tabs__tab su8-tabs__tab--active' : 'su8-tabs__tab'}
              onClick={() => setActive(index)}
              id={`${tabId}-tab-${index}`}
              aria-controls={`${tabId}-panel-${index}`}
            >
              {item.props.label}
            </button>
          );
        })}
      </div>
      <div
        className="su8-tabs__panel"
        role="tabpanel"
        id={`${tabId}-panel-${active}`}
        aria-labelledby={`${tabId}-tab-${active}`}
      >
        {items[active]?.props.children}
      </div>
    </div>
  );
}

