import Image from "next/image";

interface DSRLogoProps {
	className?: string;
	width?: number;
	height?: number;
	showText?: boolean;
}

export function DSRLogo({
	className = "",
	width = 120,
	height = 80,
	showText = true,
}: DSRLogoProps) {
	return (
		<div className={`flex items-center gap-3 ${className}`}>
			<Image
				src="/logo-dsr.svg"
				alt="DSR Inc. Logo"
				width={width}
				height={height}
				className="object-contain"
				priority
			/>
			{showText && (
				<div className="flex flex-col">
					<span className="text-xl font-bold tracking-tight">DSR Inc.</span>
					<span className="text-[10px] text-muted-foreground tracking-wide">
						WASTE RESOURCE MANAGEMENT
					</span>
				</div>
			)}
		</div>
	);
}
