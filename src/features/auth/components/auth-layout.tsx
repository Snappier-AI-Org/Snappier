import NextImage from "next/image";
import Link from "next/link";

export const AuthorLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-svh flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-linear-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, var(--snap-primary) 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>
                
                {/* Floating Decorative Elements */}
                <div className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-32 right-20 w-48 h-48 bg-primary/15 rounded-full blur-2xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse delay-500" />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
                    <Link href="/" className="flex items-center gap-3 mb-12">
                        <NextImage 
                            src="/logos/logo.svg" 
                            alt="Snappier" 
                            width={48} 
                            height={48}
                            className="drop-shadow-lg"
                        />
                        <span className="text-3xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            Snappier
                        </span>
                    </Link>
                    
                    <div className="space-y-8 max-w-lg">
                        <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-foreground leading-tight">
                            Automate your workflows with{" "}
                            <span className="text-primary">AI-powered</span> intelligence
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Connect your favorite apps, create powerful automations, and let AI handle the complexity. 
                            Build smarter workflows in minutes, not hours.
                        </p>
                        
                        {/* Feature highlights */}
                        <div className="grid gap-4 pt-4">
                            {[
                                { icon: "⚡", text: "Lightning fast execution" },
                                { icon: "🤖", text: "AI-powered automation" },
                                { icon: "🔗", text: "50+ integrations" },
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-muted-foreground">
                                    <span className="text-xl">{feature.icon}</span>
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Right Panel - Auth Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 bg-background">
                {/* Mobile Logo */}
                <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
                    <NextImage src="/logos/logo.svg" alt="Snappier" width={36} height={36} />
                    <span className="text-2xl font-bold text-primary">Snappier</span>
                </Link>
                
                <div className="w-full max-w-md">
                    {children}
                </div>
                
                {/* Footer */}
                <p className="mt-8 text-xs text-muted-foreground text-center">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-primary transition-colors">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}