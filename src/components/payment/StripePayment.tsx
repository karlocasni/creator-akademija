// Creator Akademija - Mock Stripe Decoupler
// Severed all live Stripe SDK dependencies and pubkeys

export default function StripePayment({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="text-center p-4">
      <p className="text-sm text-primary mb-4 font-bold">MOCK PAYMENT ENGINE ACTIVE</p>
      <button 
        onClick={onSuccess}
        className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-transform"
      >
        AKTIVIRAJ PROFIL (MOCK)
      </button>
    </div>
  );
}
