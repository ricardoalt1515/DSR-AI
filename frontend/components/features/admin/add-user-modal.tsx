"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OrgUserCreateInput } from "@/lib/api/organizations";
import type { UserRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const PASSWORD_REQUIREMENTS = [
	{
		key: "length",
		label: "At least 8 characters",
		test: (p: string) => p.length >= 8,
	},
	{
		key: "uppercase",
		label: "Contains uppercase letter",
		test: (p: string) => /[A-Z]/.test(p),
	},
	{
		key: "number",
		label: "Contains number",
		test: (p: string) => /[0-9]/.test(p),
	},
] as const;

const TENANT_ROLES: {
	value: Exclude<UserRole, "admin">;
	label: string;
	description: string;
}[] = [
	{
		value: "org_admin",
		label: "Org Admin",
		description: "Full access to organization settings and user management",
	},
	{
		value: "field_agent",
		label: "Field Agent",
		description: "Create and manage field assessments",
	},
	// {
	// 	value: "sales",
	// 	label: "Sales Rep",
	// 	description: "View projects and manage proposals",
	// },
	// {
	// 	value: "contractor",
	// 	label: "Contractor",
	// 	description: "Execute approved projects",
	// },
	// {
	// 	value: "compliance",
	// 	label: "Compliance",
	// 	description: "Review and approve compliance requirements",
	// },
];

function getPasswordStrength(password: string): {
	score: number;
	label: string;
	color: string;
} {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
	if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
	if (score <= 4) return { score, label: "Good", color: "bg-blue-500" };
	return { score, label: "Strong", color: "bg-green-500" };
}

interface AddUserModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: OrgUserCreateInput) => Promise<void>;
	organizationName?: string;
}

export function AddUserModal({
	open,
	onOpenChange,
	onSubmit,
	organizationName,
}: AddUserModalProps) {
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "field_agent" as Exclude<UserRole, "admin">,
	});
	const [submitting, setSubmitting] = useState(false);

	const handleInputChange = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm({
			email: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
			role: "field_agent",
		});
	};

	const passwordStrength = useMemo(
		() => getPasswordStrength(form.password),
		[form.password],
	);

	const canSubmitForm = useMemo(() => {
		return (
			form.email.trim() !== "" &&
			form.password.length >= 8 &&
			/[A-Z]/.test(form.password) &&
			/[0-9]/.test(form.password) &&
			form.password === form.confirmPassword &&
			form.firstName.trim() !== "" &&
			form.lastName.trim() !== ""
		);
	}, [form]);

	const handleSubmit = async () => {
		if (!canSubmitForm) return;

		setSubmitting(true);
		try {
			await onSubmit({
				email: form.email.trim(),
				password: form.password,
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				role: form.role,
			});
			resetForm();
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
		resetForm();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Team Member</DialogTitle>
					<DialogDescription>
						{organizationName
							? `Create a new user in ${organizationName}`
							: "Create a new user in your organization"}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email *</Label>
						<Input
							id="email"
							type="email"
							placeholder="user@company.com"
							value={form.email}
							onChange={(e) => handleInputChange("email", e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="firstName">First Name *</Label>
							<Input
								id="firstName"
								value={form.firstName}
								onChange={(e) => handleInputChange("firstName", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="lastName">Last Name *</Label>
							<Input
								id="lastName"
								value={form.lastName}
								onChange={(e) => handleInputChange("lastName", e.target.value)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="password">Password *</Label>
							<Input
								id="password"
								type="password"
								value={form.password}
								onChange={(e) => handleInputChange("password", e.target.value)}
								aria-describedby="password-requirements"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm *</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={form.confirmPassword}
								onChange={(e) =>
									handleInputChange("confirmPassword", e.target.value)
								}
								aria-invalid={
									form.confirmPassword.length > 0 &&
									form.password !== form.confirmPassword
								}
								aria-describedby={
									form.confirmPassword.length > 0 &&
									form.password !== form.confirmPassword
										? "password-mismatch"
										: undefined
								}
							/>
						</div>
					</div>
					{form.confirmPassword.length > 0 &&
						form.password !== form.confirmPassword && (
							<p
								id="password-mismatch"
								className="text-xs text-destructive"
								role="alert"
							>
								Passwords do not match
							</p>
						)}
					{form.password && (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div
									className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
									role="progressbar"
									aria-valuenow={passwordStrength.score}
									aria-valuemin={0}
									aria-valuemax={5}
									aria-label={`Password strength: ${passwordStrength.label}`}
								>
									<div
										className={cn(
											"h-full transition-[width]",
											passwordStrength.color,
										)}
										style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
									/>
								</div>
								<span className="text-xs text-muted-foreground">
									{passwordStrength.label}
								</span>
							</div>
						</div>
					)}
					<ul
						id="password-requirements"
						className="space-y-1"
						aria-label="Password requirements"
					>
						{PASSWORD_REQUIREMENTS.map((req) => {
							const passed =
								form.password.length > 0 && req.test(form.password);
							return (
								<li
									key={req.key}
									className={cn(
										"flex items-center gap-2 text-xs transition-colors",
										form.password.length === 0
											? "text-muted-foreground"
											: passed
												? "text-green-600 dark:text-green-400"
												: "text-muted-foreground",
									)}
								>
									<span className="w-3 text-center" aria-hidden="true">
										{form.password.length === 0 ? "○" : passed ? "✓" : "○"}
									</span>
									<span>{req.label}</span>
									<span className="sr-only">
										{passed ? "(met)" : "(not met)"}
									</span>
								</li>
							);
						})}
					</ul>
					<div className="border-t border-border/50 my-4" />
					<div className="space-y-2">
						<Label htmlFor="role">Role *</Label>
						<Select
							value={form.role}
							onValueChange={(value) =>
								handleInputChange("role", value as Exclude<UserRole, "admin">)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TENANT_ROLES.map((role) => (
									<SelectItem key={role.value} value={role.value}>
										<div>
											<div>{role.label}</div>
											<div className="text-xs text-muted-foreground">
												{role.description}
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmitForm || submitting}
					>
						{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{submitting ? "Creating..." : "Create User"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
