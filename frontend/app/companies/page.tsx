"use client";

/**
 * Companies page - List all client companies
 */
import { Building2, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyCard } from "@/components/features/companies/company-card";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/contexts/auth-context";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { useCompanyStore } from "@/lib/stores/company-store";

export default function CompaniesPage() {
	const { companies, loading, loadCompanies } = useCompanyStore();
	const { canCreateClientData } = useAuth();
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearch = useDebouncedValue(searchTerm, 300);

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	// Filter companies by search term
	const filteredCompanies = useMemo(() => {
		if (!debouncedSearch) return companies;

		const search = debouncedSearch.toLowerCase();
		return companies.filter(
			(company) =>
				company.name.toLowerCase().includes(search) ||
				company.industry?.toLowerCase().includes(search),
		);
	}, [companies, debouncedSearch]);

	if (loading && companies.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Building2 className="h-8 w-8" />
						Companies
					</h1>
					<p className="text-muted-foreground mt-2">
						Manage client companies and their locations
					</p>
				</div>
				{canCreateClientData && (
					<CreateCompanyDialog onSuccess={() => loadCompanies()} />
				)}
			</div>

			{/* Search Bar */}
			<div className="relative max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search companies by name or industry..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-9 pr-9"
					autoComplete="off"
				/>
				{searchTerm && (
					<button
						type="button"
						onClick={() => setSearchTerm("")}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			{/* Results counter */}
			{searchTerm && (
				<p className="text-sm text-muted-foreground">
					Found {filteredCompanies.length} of {companies.length} companies
				</p>
			)}

			{/* Companies Grid */}
			{companies.length === 0 ? (
				<div className="text-center py-12">
					<Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">No companies yet</h3>
					<p className="text-muted-foreground mb-4">
						{canCreateClientData
							? "Create your first company to get started"
							: "No companies have been added yet"}
					</p>
					{canCreateClientData && (
						<CreateCompanyDialog
							trigger={<Button>Create First Company</Button>}
							onSuccess={() => loadCompanies()}
						/>
					)}
				</div>
			) : filteredCompanies.length === 0 ? (
				<div className="text-center py-12">
					<Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">
						No companies match your search
					</h3>
					<p className="text-muted-foreground mb-4">
						Try adjusting your search terms
					</p>
					<Button variant="outline" onClick={() => setSearchTerm("")}>
						Clear search
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredCompanies.map((company) => (
						<CompanyCard key={company.id} company={company} />
					))}
				</div>
			)}
		</div>
	);
}
