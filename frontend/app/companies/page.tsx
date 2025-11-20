"use client";

import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
/**
 * Companies page - List all client companies
 */
import { useEffect } from "react";
import { CompanyCard } from "@/components/features/companies/company-card";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
import { Button } from "@/components/ui/button";
import { useCompanyStore } from "@/lib/stores/company-store";

export default function CompaniesPage() {
	const router = useRouter();
	const { companies, loading, loadCompanies } = useCompanyStore();

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

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
				<CreateCompanyDialog onSuccess={() => loadCompanies()} />
			</div>

			{/* Companies Grid */}
			{companies.length === 0 ? (
				<div className="text-center py-12">
					<Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">No companies yet</h3>
					<p className="text-muted-foreground mb-4">
						Create your first company to get started
					</p>
					<CreateCompanyDialog
						trigger={<Button>Create First Company</Button>}
						onSuccess={() => loadCompanies()}
					/>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{companies.map((company) => (
						<CompanyCard
							key={company.id}
							company={company}
							onClick={() => router.push(`/companies/${company.id}`)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
