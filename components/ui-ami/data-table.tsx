'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp, listItemTransition, tableRow } from '@/lib/motion';
import { EmptyState } from './empty-state';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  /** Pin to card header on mobile (defaults to first column) */
  mobilePrimary?: boolean;
  /** Hide from mobile card field grid */
  mobileHidden?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyFn: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  expandable?: boolean;
  expandedKey?: string | null;
  onExpandToggle?: (row: T) => void;
  renderExpanded?: (row: T) => React.ReactNode;
  className?: string;
  animateRows?: boolean;
  /** auto = cards below md, table at md+ */
  layout?: 'auto' | 'table' | 'cards';
  /** Nested inside DataCard — skips outer card chrome */
  embedded?: boolean;
}

function getPrimaryColumn<T>(columns: DataTableColumn<T>[]) {
  return columns.find((c) => c.mobilePrimary) ?? columns[0];
}

function getMobileFieldColumns<T>(columns: DataTableColumn<T>[], primary: DataTableColumn<T>) {
  return columns.filter((c) => c !== primary && !c.mobileHidden);
}

export function DataTable<T>({
  columns,
  data,
  keyFn,
  loading,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  expandable,
  expandedKey,
  onExpandToggle,
  renderExpanded,
  className,
  animateRows = true,
  layout = 'auto',
  embedded = false,
}: DataTableProps<T>) {
  const primaryColumn = getPrimaryColumn(columns);
  const mobileFieldColumns = getMobileFieldColumns(columns, primaryColumn);
  const showMobileCards = layout === 'cards' || layout === 'auto';
  const showDesktopTable = layout === 'table' || layout === 'auto';

  if (loading) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className={cn('ds-card overflow-hidden', className)}
      >
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={listItemTransition(i)}
              className="h-10 bg-muted rounded-md animate-pulse"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className={cn('ds-card', className)}>
        <EmptyState icon={Database} title={emptyTitle} description={emptyDescription} />
      </motion.div>
    );
  }

  const RowTag = animateRows ? motion.tr : 'tr';

  const renderMobileCard = (row: T, rowIndex: number) => {
    const rowKey = keyFn(row);
    const isExpanded = expandedKey === rowKey;
    const motionProps = animateRows
      ? {
          variants: tableRow,
          initial: 'initial' as const,
          animate: 'animate' as const,
          transition: listItemTransition(rowIndex),
        }
      : {};

    const Comp = animateRows ? motion.div : 'div';

    return (
      <Comp
        key={rowKey}
        {...motionProps}
        className={cn(
          'ds-table-mobile-card',
          onRowClick && 'ds-table-mobile-card--clickable',
          isExpanded && 'ds-table-mobile-card--expanded',
        )}
      >
        <div
          className={cn('ds-table-mobile-card-top', onRowClick && 'cursor-pointer')}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={
            onRowClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }
              : undefined
          }
          role={onRowClick ? 'button' : undefined}
          tabIndex={onRowClick ? 0 : undefined}
        >
          <div className="ds-table-mobile-card-main">
            <div className="min-w-0 flex-1 text-left">{primaryColumn.cell(row)}</div>
            {onRowClick && <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden />}
          </div>
          {expandable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpandToggle?.(row);
              }}
              className="ds-btn-icon ds-btn-ghost h-8 w-8 shrink-0"
              aria-expanded={isExpanded}
              aria-label="Expand row"
            >
              <ChevronDown size={14} className={cn('transition-transform duration-200', isExpanded && 'rotate-180')} />
            </button>
          )}
        </div>

        <dl className="ds-table-mobile-card-fields">
          {mobileFieldColumns.map((col) => (
            <div key={col.key} className="ds-table-mobile-field">
              <dt>{col.header}</dt>
              <dd>{col.cell(row)}</dd>
            </div>
          ))}
        </dl>

        <AnimatePresence initial={false}>
          {isExpanded && renderExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-border"
            >
              {renderExpanded(row)}
            </motion.div>
          )}
        </AnimatePresence>
      </Comp>
    );
  };

  const Wrapper = embedded ? 'div' : motion.div;
  const wrapperProps = embedded
    ? { className: cn('overflow-hidden', className) }
    : {
        variants: fadeInUp,
        initial: 'initial' as const,
        animate: 'animate' as const,
        className: cn('ds-card overflow-hidden', className),
      };

  return (
    <Wrapper {...wrapperProps}>
      {showMobileCards && (
        <div className={cn('ds-table-mobile-list', showDesktopTable && 'md:hidden')}>
          {data.map((row, rowIndex) => renderMobileCard(row, rowIndex))}
        </div>
      )}

      {showDesktopTable && (
        <div className={cn('ds-table-wrap', showMobileCards && layout === 'auto' && 'hidden md:block')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {expandable && <th className="w-8 px-2 py-2.5" aria-hidden />}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2.5 text-left font-semibold text-foreground',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => {
                const rowKey = keyFn(row);
                const isExpanded = expandedKey === rowKey;
                const rowMotionProps = animateRows
                  ? {
                      variants: tableRow,
                      initial: 'initial' as const,
                      animate: 'animate' as const,
                      transition: listItemTransition(rowIndex),
                    }
                  : {};

                return (
                  <React.Fragment key={rowKey}>
                    <RowTag
                      {...rowMotionProps}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        'border-b border-border transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-muted/30',
                      )}
                    >
                      {expandable && (
                        <td className="px-2 py-2.5 align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExpandToggle?.(row);
                            }}
                            className="ds-btn-icon ds-btn-ghost h-7 w-7"
                            aria-expanded={isExpanded}
                            aria-label="Expand row"
                          >
                            <ChevronDown size={14} className={cn('transition-transform duration-200', isExpanded && 'rotate-180')} />
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn('px-3 py-2.5', col.hideOnMobile && 'hidden md:table-cell', col.className)}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </RowTag>
                    <AnimatePresence initial={false}>
                      {isExpanded && renderExpanded && (
                        <motion.tr
                          key={`${rowKey}-expanded`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b border-border"
                        >
                          <td colSpan={columns.length + (expandable ? 1 : 0)} className="p-0 overflow-hidden">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {renderExpanded(row)}
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Wrapper>
  );
}
