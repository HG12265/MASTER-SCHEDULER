"use client";

import React, { useState, useMemo, ReactNode } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { TableColumn, PaginationMeta } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { cn } from "@/lib/utils";

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchableKey?: keyof T;
  isLoading?: boolean;
  // Optional server-side pagination
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  // Optional external search control (debounced server search)
  searchValue?: string;
  onSearchChange?: (term: string) => void;
  // Optional custom filter tools slot
  filterSlot?: ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display matching your criteria.",
  searchPlaceholder = "Search records...",
  searchableKey,
  isLoading = false,
  pagination,
  onPageChange,
  searchValue,
  onSearchChange,
  filterSlot,
}: DataTableProps<T>) {
  // Client-side search state when onSearchChange is not provided
  const [localSearch, setLocalSearch] = useState("");
  const isServerSearch = onSearchChange !== undefined;
  const currentSearch = isServerSearch ? (searchValue ?? "") : localSearch;

  const handleSearchInput = (val: string) => {
    if (isServerSearch) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const filteredData = useMemo(() => {
    if (isServerSearch || !currentSearch.trim()) return data;
    const term = currentSearch.toLowerCase();

    return data.filter((item) => {
      if (searchableKey) {
        const val = item[searchableKey];
        return String(val ?? "").toLowerCase().includes(term);
      }
      return Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, currentSearch, searchableKey, isServerSearch]);

  const totalEntries = pagination ? pagination.total : data.length;
  const displayedEntries = pagination ? data.length : filteredData.length;

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      {/* Search & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => handleSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter dropdowns slot */}
          {filterSlot && (
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {filterSlot}
            </div>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500 self-end lg:self-center shrink-0">
          Showing <span className="font-semibold text-slate-800">{displayedEntries}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalEntries}</span> entries
        </div>
      </div>

      {/* Table Body Content */}
      {isLoading ? (
        <div className="py-16">
          <LoadingState message="Loading records from database..." />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={emptyTitle}
            description={
              currentSearch
                ? `No entries matched "${currentSearch}". Try resetting your search.`
                : emptyDescription
            }
            action={
              currentSearch
                ? {
                    label: "Clear Search",
                    onClick: () => handleSearchInput(""),
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {columns.map((col, idx) => {
                  const colKey = col.key || (col.accessor ? String(col.accessor) : `col-${idx}`);
                  return (
                    <th
                      key={colKey}
                      scope="col"
                      style={{ width: col.width }}
                      className={cn(
                        "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 select-none",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                        col.className
                      )}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {columns.map((col, idx) => {
                    const colKey = col.key || (col.accessor ? String(col.accessor) : `col-${idx}`);
                    const renderFn = col.cell || col.render;
                    const rawVal = col.accessor
                      ? (row as any)[col.accessor]
                      : col.key
                      ? (row as any)[col.key]
                      : "-";

                    return (
                      <td
                        key={colKey}
                        className={cn(
                          "px-4 py-3 text-slate-700 whitespace-nowrap",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.className
                        )}
                      >
                        {renderFn ? renderFn(row) : (rawVal ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40 text-xs">
          <div className="text-slate-500 font-medium">
            Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => onPageChange(pagination.page - 1)}
              className="inline-flex items-center px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => onPageChange(pagination.page + 1)}
              className="inline-flex items-center px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
