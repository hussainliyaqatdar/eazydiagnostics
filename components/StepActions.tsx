import Link from "next/link";

// The call-to-action row used on every step of booking - the cart, patient
// details, and address & time - so they look and behave the same: a quiet
// secondary action on the left (go back / add more) and the primary action
// filling the rest of the row.
type Action = { label: string; onClick?: () => void; href?: string };

const PRIMARY = "flex-1 rounded-md bg-brand px-4 py-3 text-center font-medium text-white transition hover:bg-brand-dark disabled:opacity-60";
const PRIMARY_OFF = "flex-1 cursor-not-allowed rounded-md bg-gray-200 px-4 py-3 text-center font-medium text-gray-500";
const SECONDARY = "shrink-0 rounded-md border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:border-brand hover:text-brand";

export default function StepActions({
  primary,
  secondary,
  disabled = false,
  busy = false,
  onPrimaryNavigate,
}: {
  primary: Action;
  secondary?: Action;
  disabled?: boolean;
  busy?: boolean;
  // Runs when a link-style primary is clicked (e.g. close the cart drawer first).
  onPrimaryNavigate?: () => void;
}) {
  return (
    <div className="flex items-stretch gap-3">
      {secondary &&
        (secondary.href ? (
          <Link href={secondary.href} className={SECONDARY}>{secondary.label}</Link>
        ) : (
          <button type="button" onClick={secondary.onClick} className={SECONDARY}>{secondary.label}</button>
        ))}
      {disabled ? (
        <span className={PRIMARY_OFF} aria-disabled="true">{primary.label}</span>
      ) : primary.href ? (
        <Link href={primary.href} onClick={onPrimaryNavigate} className={PRIMARY}>{primary.label}</Link>
      ) : (
        <button type="button" onClick={primary.onClick} disabled={busy} className={PRIMARY}>{primary.label}</button>
      )}
    </div>
  );
}
