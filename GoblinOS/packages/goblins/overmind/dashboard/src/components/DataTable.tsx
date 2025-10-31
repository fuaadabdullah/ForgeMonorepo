import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  Search,
  Share2,
  Square,
} from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '../lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  sortable?: boolean
  filterable?: boolean
  frozen?: boolean
  render?: (value: any, row: T) => React.ReactNode
  filterRenderer?: (value: any, onChange: (value: any) => void) => React.ReactNode
}

export interface DataTablePreset {
  id: string
  name: string
  filters: Record<string, any>
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  presets?: DataTablePreset[]
  onPresetSelect?: (preset: DataTablePreset) => void
  onSaveView?: (
    name: string,
    filters: Record<string, any>,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc'
  ) => void
  onShareView?: (
    filters: Record<string, any>,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc'
  ) => void
  batchActions?: Array<{
    label: string
    action: (selectedIds: (string | number)[]) => void
    variant?: 'primary' | 'secondary' | 'danger'
  }>
  className?: string
  height?: number
  enableSelection?: boolean
  onSelectionChange?: (selectedIds: (string | number)[]) => void
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  presets = [],
  onPresetSelect,
  onSaveView,
  onShareView,
  batchActions = [],
  className,
  height = 600,
  enableSelection = true,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())
  const [showFilters, setShowFilters] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')

  // Parse URL parameters for saved views
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewParam = urlParams.get('view')
    if (viewParam) {
      try {
        const view = JSON.parse(decodeURIComponent(viewParam))
        if (view.filters) setFilters(view.filters)
        if (view.sortBy) setSortBy(view.sortBy)
        if (view.sortDirection) setSortDirection(view.sortDirection)
      } catch (_e) {
        console.warn('Invalid view parameter in URL')
      }
    }
  }, [])

  // Filter and sort data
  const processedData = useMemo(() => {
    const filtered = data.filter((row) => {
      // Apply column filters
      for (const [key, filterValue] of Object.entries(filters)) {
        if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
          const value = row[key]
          if (typeof value === 'string' && typeof filterValue === 'string') {
            if (!value.toLowerCase().includes(filterValue.toLowerCase())) return false
          } else if (value !== filterValue) {
            return false
          }
        }
      }

      // Apply global search
      if (searchTerm) {
        const searchableText = Object.values(row).join(' ').toLowerCase()
        if (!searchableText.includes(searchTerm.toLowerCase())) return false
      }

      return true
    })

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, filters, searchTerm, sortBy, sortDirection])

  const handleSort = useCallback(
    (columnKey: string) => {
      if (sortBy === columnKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSortBy(columnKey)
        setSortDirection('asc')
      }
    },
    [sortBy, sortDirection]
  )

  const handleFilterChange = useCallback((columnKey: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }))
  }, [])

  const handleRowSelect = useCallback(
    (id: string | number) => {
      setSelectedRows((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        onSelectionChange?.(Array.from(newSet))
        return newSet
      })
    },
    [onSelectionChange]
  )

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    } else {
      const allIds = processedData.map((row) => row[keyField])
      setSelectedRows(new Set(allIds))
      onSelectionChange?.(allIds)
    }
  }, [processedData, keyField, selectedRows.size, onSelectionChange])

  const handleSaveView = useCallback(() => {
    if (saveViewName.trim()) {
      onSaveView?.(saveViewName.trim(), filters, sortBy || undefined, sortDirection)
      setShowSaveDialog(false)
      setSaveViewName('')
    }
  }, [saveViewName, filters, sortBy, sortDirection, onSaveView])

  const handleShareView = useCallback(() => {
    const viewData = { filters, sortBy, sortDirection }
    const encoded = encodeURIComponent(JSON.stringify(viewData))
    const url = `${window.location.pathname}?view=${encoded}`
    navigator.clipboard.writeText(url)
    onShareView?.(filters, sortBy || undefined, sortDirection)
  }, [filters, sortBy, sortDirection, onShareView])

  const frozenColumns = columns.filter((col) => col.frozen)
  const scrollableColumns = columns.filter((col) => !col.frozen)

  return (
    <div className={cn('flex flex-col border border-border rounded-md', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
            />
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">View:</span>
              <select
                className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => {
                  const preset = presets.find((p) => p.id === e.target.value)
                  if (preset) {
                    onPresetSelect?.(preset)
                    setFilters(preset.filters)
                    setSortBy(preset.sortBy || null)
                    setSortDirection(preset.sortDirection || 'asc')
                  }
                }}
              >
                <option value="">Custom</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save View */}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            title="Save current view"
          >
            <Save className="h-4 w-4" />
            Save View
          </button>

          {/* Share View */}
          <button
            onClick={handleShareView}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            title="Share current view"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Batch Actions */}
      {enableSelection && selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border-b border-border">
          <span className="text-sm font-medium">
            {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {batchActions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.action(Array.from(selectedRows))}
                className={cn(
                  'px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary',
                  action.variant === 'primary' &&
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                  action.variant === 'secondary' &&
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  action.variant === 'danger' &&
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                  !action.variant && 'border border-border hover:bg-accent'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex overflow-hidden" style={{ height }}>
        {/* Frozen Columns */}
        {frozenColumns.length > 0 && (
          <div className="flex flex-col border-r border-border bg-muted/20">
            {/* Frozen Header */}
            <div className="flex border-b border-border bg-background sticky top-0 z-20">
              {enableSelection && (
                <div className="flex items-center justify-center p-3 border-r border-border w-12">
                  <button
                    onClick={handleSelectAll}
                    className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    title={
                      selectedRows.size === processedData.length ? 'Deselect all' : 'Select all'
                    }
                  >
                    {selectedRows.size === processedData.length && processedData.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
              {frozenColumns.map((column) => (
                <div
                  key={column.key as string}
                  className="flex flex-col border-r border-border last:border-r-0"
                  style={{ width: column.width || 150 }}
                >
                  <div className="p-3 font-medium text-sm border-b border-border">
                    <div className="flex items-center justify-between">
                      <span>{column.header}</span>
                      <div className="flex items-center gap-1">
                        {column.sortable && (
                          <button
                            onClick={() => handleSort(column.key as string)}
                            className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                          >
                            {sortBy === column.key ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            ) : (
                              <ChevronDown className="h-4 w-4 opacity-30" />
                            )}
                          </button>
                        )}
                        {column.filterable && (
                          <button
                            onClick={() =>
                              setShowFilters((prev) => ({
                                ...prev,
                                [column.key as string]: !prev[column.key as string],
                              }))
                            }
                            className={cn(
                              'focus:outline-none focus:ring-2 focus:ring-primary rounded',
                              filters[column.key as string] && 'text-primary'
                            )}
                          >
                            <Filter className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {showFilters[column.key as string] && column.filterable && (
                      <div className="mt-2">
                        {column.filterRenderer ? (
                          column.filterRenderer(filters[column.key as string], (value) =>
                            handleFilterChange(column.key as string, value)
                          )
                        ) : (
                          <input
                            type="text"
                            placeholder={`Filter ${column.header.toLowerCase()}...`}
                            value={filters[column.key as string] || ''}
                            onChange={(e) =>
                              handleFilterChange(column.key as string, e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Frozen Body */}
            <div className="flex-1 overflow-auto">
              {processedData.map((row) => (
                <div key={row[keyField]} className="flex border-b border-border hover:bg-accent/30">
                  {enableSelection && (
                    <div className="flex items-center justify-center p-3 border-r border-border w-12">
                      <button
                        onClick={() => handleRowSelect(row[keyField])}
                        className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      >
                        {selectedRows.has(row[keyField]) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {frozenColumns.map((column) => (
                    <div
                      key={column.key as string}
                      className="p-3 text-sm border-r border-border last:border-r-0"
                      style={{ width: column.width || 150 }}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Columns */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Header */}
          <div className="flex border-b border-border bg-background sticky top-0 z-10">
            {!frozenColumns.length && enableSelection && (
              <div className="flex items-center justify-center p-3 border-r border-border w-12">
                <button
                  onClick={handleSelectAll}
                  className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  title={selectedRows.size === processedData.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedRows.size === processedData.length && processedData.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
            {scrollableColumns.map((column) => (
              <div
                key={column.key as string}
                className="flex flex-col border-r border-border last:border-r-0 flex-1"
                style={{ minWidth: column.width || 150 }}
              >
                <div className="p-3 font-medium text-sm border-b border-border">
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    <div className="flex items-center gap-1">
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column.key as string)}
                          className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                        >
                          {sortBy === column.key ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          ) : (
                            <ChevronDown className="h-4 w-4 opacity-30" />
                          )}
                        </button>
                      )}
                      {column.filterable && (
                        <button
                          onClick={() =>
                            setShowFilters((prev) => ({ ...prev, [column.key as string]: !prev[column.key as string] }))
                          }
                          className={cn(
                            'focus:outline-none focus:ring-2 focus:ring-primary rounded',
                            filters[column.key as string] && 'text-primary'
                          )}
                        >
                          <Filter className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {showFilters[column.key as string] && column.filterable && (
                    <div className="mt-2">
                      {column.filterRenderer ? (
                        column.filterRenderer(filters[column.key as string], (value) =>
                          handleFilterChange(column.key as string, value)
                        )
                      ) : (
                        <input
                          type="text"
                          placeholder={`Filter ${column.header.toLowerCase()}...`}
                          value={filters[column.key as string] || ''}
                          onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-auto">
            {processedData.map((row) => (
              <div key={row[keyField]} className="flex border-b border-border hover:bg-accent/30">
                {!frozenColumns.length && enableSelection && (
                  <div className="flex items-center justify-center p-3 border-r border-border w-12">
                    <button
                      onClick={() => handleRowSelect(row[keyField])}
                      className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    >
                      {selectedRows.has(row[keyField]) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
                {scrollableColumns.map((column) => (
                  <div
                    key={column.key as string}
                    className="p-3 text-sm border-r border-border last:border-r-0 flex-1"
                    style={{ minWidth: column.width || 150 }}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Showing {processedData.length} of {data.length} items
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters({})}
            className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save View</h3>
            <input
              type="text"
              placeholder="View name..."
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
