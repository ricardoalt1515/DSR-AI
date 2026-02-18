"use client";

import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	AlertCircle,
	ArrowUpDown,
	Bot,
	Calculator,
	ChevronDown,
	Edit3,
	Filter,
	Info,
	Settings,
	Upload,
} from "lucide-react";
import * as React from "react";
import { FieldEditor } from "@/components/features/technical-data/field-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { IMPORTANCE_CONFIG, SOURCE_CONFIG } from "@/lib/constants";
import { hasFieldValue } from "@/lib/technical-data-field-utils";
import type {
	DataSource,
	TableField,
	TableSection,
} from "@/lib/types/technical-data";
import { cn } from "@/lib/utils";

interface FieldRow extends TableField {
	sectionTitle: string;
	sectionId: string;
	isCalculated?: boolean;
	hasError?: boolean;
	lastModified?: string;
}

type FieldValue = TableField["value"];

interface EngineeringDataTableProps {
	sections: TableSection[];
	onFieldChange: (
		sectionId: string,
		fieldId: string,
		value: FieldValue,
		unit?: string,
		source?: DataSource,
	) => void;
	className?: string;
}

const sourceConfig = {
	manual: {
		...SOURCE_CONFIG.manual,
		icon: Edit3,
	},
	imported: {
		...SOURCE_CONFIG.imported,
		icon: Upload,
	},
	ai: {
		...SOURCE_CONFIG.ai,
		icon: Bot,
	},
};

const importanceConfig = {
	critical: {
		label: IMPORTANCE_CONFIG.critical.label,
		variant: IMPORTANCE_CONFIG.critical.variant,
	},
	recommended: {
		label: IMPORTANCE_CONFIG.recommended.label,
		variant: IMPORTANCE_CONFIG.recommended.variant,
	},
	optional: {
		label: IMPORTANCE_CONFIG.optional.label,
		variant: IMPORTANCE_CONFIG.optional.variant,
	},
};

// ✅ REFACTOR: Componente EditableCell eliminado - ahora usa FieldEditor compartido

export function EngineeringDataTable({
	sections,
	onFieldChange,
	className,
}: EngineeringDataTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [globalFilter, setGlobalFilter] = React.useState("");

	// Convert sections to flat field rows
	const data: FieldRow[] = React.useMemo(() => {
		return sections.flatMap((section) =>
			section.fields.map((field) => {
				// Check if field has calculation formula or depends on other fields
				const isCalculated = !!(
					("formula" in field && field.formula) ||
					("dependsOn" in field && field.dependsOn) ||
					field.id.includes("calculated") ||
					field.id.includes("auto")
				);

				return {
					...field,
					sectionTitle: section.title,
					sectionId: section.id,
					isCalculated,
					hasError: !!(field.required && !field.value && field.value !== 0),
					...(field.lastUpdatedAt ? { lastModified: field.lastUpdatedAt } : {}),
				};
			}),
		);
	}, [sections]);

	const columns: ColumnDef<FieldRow>[] = [
		{
			accessorKey: "sectionTitle",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2"
				>
					Section
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="text-sm font-medium text-muted-foreground max-w-[120px] truncate">
					{row.getValue("sectionTitle")}
				</div>
			),
		},
		{
			accessorKey: "label",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2"
				>
					Parameter
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			),
			cell: ({ row }) => {
				const field = row.original;
				return (
					<div className="flex items-center gap-2">
						<div className="flex flex-col">
							<span className="font-medium text-sm">{field.label}</span>
							{field.description && (
								<span className="text-xs text-muted-foreground line-clamp-1">
									{field.description}
								</span>
							)}
						</div>
						{field.importance && (
							<Badge variant={importanceConfig[field.importance].variant}>
								{importanceConfig[field.importance].label}
							</Badge>
						)}
						{field.hasError && (
							<Tooltip>
								<TooltipTrigger>
									<AlertCircle className="h-4 w-4 text-destructive" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Required field</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "value",
			header: "Value",
			cell: ({ row }) => {
				// ✅ Adapter: FieldEditor signature → EngineeringDataTable signature
				const handleSave = (
					sectionId: string,
					fieldId: string,
					value: FieldValue,
					unit?: string,
					_notes?: string,
				) => {
					onFieldChange(sectionId, fieldId, value, unit);
				};

				return (
					<FieldEditor
						field={row.original}
						sectionId={row.original.sectionId}
						mode="table"
						onSave={handleSave}
						showLabel={false}
						showNotes={false}
						autoSave={false}
					/>
				);
			},
		},
		{
			accessorKey: "source",
			header: "Source",
			cell: ({ row }) => {
				const source = row.getValue("source") as DataSource;
				const config = sourceConfig[source];
				const Icon = config.icon;

				return (
					<Badge variant={config.variant} className="text-xs">
						<Icon className="mr-1 h-3 w-3" />
						{config.label}
					</Badge>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const field = row.original;

				return (
					<div className="flex items-center gap-1">
						{field.isCalculated && (
							<Tooltip>
								<TooltipTrigger>
									<Calculator className="h-4 w-4 text-primary" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Automatically calculated value</p>
								</TooltipContent>
							</Tooltip>
						)}
						{field.description && (
							<Tooltip>
								<TooltipTrigger>
									<Info className="h-4 w-4 text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent className="max-w-[300px]">
									<p>{field.description}</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: "includesString",
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			globalFilter,
		},
	});

	const completedFields = data.filter((field) =>
		hasFieldValue(field.value),
	).length;
	const totalFields = data.length;
	const completionPercentage =
		totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

	return (
		<TooltipProvider>
			<div className={cn("space-y-4", className)}>
				{/* Header with stats */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg">Engineering View</CardTitle>
								<CardDescription>
									Compact table for quick editing of technical parameters
								</CardDescription>
							</div>
							<div className="flex items-center gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold">
										{completionPercentage}%
									</div>
									<div className="text-xs text-muted-foreground">Complete</div>
								</div>
								<Separator orientation="vertical" className="h-8" />
								<div className="text-center">
									<div className="text-xl font-semibold">
										{completedFields}/{totalFields}
									</div>
									<div className="text-xs text-muted-foreground">Fields</div>
								</div>
							</div>
						</div>
					</CardHeader>
				</Card>

				{/* Filters and controls */}
				<div className="flex items-center gap-4">
					<div className="flex-1">
						<Input
							placeholder="Search parameters..."
							value={globalFilter}
							onChange={(event) => setGlobalFilter(event.target.value)}
							className="max-w-sm"
						/>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<Filter className="mr-2 h-4 w-4" />
								Source
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Filter by source</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{Object.entries(sourceConfig).map(([key, config]) => (
								<DropdownMenuCheckboxItem
									key={key}
									checked={
										table.getColumn("source")?.getFilterValue() === key ||
										!table.getColumn("source")?.getFilterValue()
									}
									onCheckedChange={(checked) => {
										table
											.getColumn("source")
											?.setFilterValue(checked ? undefined : key);
									}}
								>
									<config.icon className="mr-2 h-4 w-4" />
									{config.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<Settings className="mr-2 h-4 w-4" />
								Columns
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Data table */}
				<Card>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id} className="h-10">
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										className={cn(
											"hover:bg-muted/50",
											row.original.hasError &&
												"bg-destructive/15 hover:bg-destructive/20",
										)}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="py-2">
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										<div className="flex flex-col items-center gap-2">
											<div className="text-muted-foreground">
												No parameters to display
											</div>
											<div className="text-sm text-muted-foreground">
												Add sections to start capturing data
											</div>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</Card>

				{/* Footer with summary */}
				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<div>
						Showing {table.getRowModel().rows.length} of {data.length}{" "}
						parameters
					</div>
					<div className="flex gap-4">
						<span>
							✅ {data.filter((f) => f.source === "manual").length} Manual
						</span>
						<span>
							📁 {data.filter((f) => f.source === "imported").length} Imported
						</span>
						<span>🤖 {data.filter((f) => f.source === "ai").length} AI</span>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}
