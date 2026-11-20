import { getTrialTimeLeft } from './plans'

export default function SubscriptionDialog({ subscription, subscriptionError, closeSubscription, openSubscriptionPage }) {
  return (
    <div className="subscription-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && subscription?.accessActive) closeSubscription()
    }}>
      <section className="subscription-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-title">
        <button className="subscription-close" type="button" aria-label="Close subscription" onClick={closeSubscription}>×</button>
        <div className="subscription-symbol" aria-hidden="true">♢</div>
        <p className="subscription-kicker">{subscription?.demoSubscription ? 'DEMO ACCESS' : subscription?.subscriptionActive ? 'YOUR PLAN' : subscription?.trialActive ? 'FREE TRIAL' : 'TRIAL ENDED'}</p>
        <h2 id="subscription-title">{subscription?.demoSubscription ? 'Demo subscription active' : subscription?.subscriptionActive ? 'Subscription active' : subscription?.trialActive ? 'Enjoy your free day' : 'Keep your resume insights going'}</h2>
        <p className="subscription-description">{subscription?.subscriptionActive
          ? subscription.demoSubscription
            ? `Demo-only access is active until ${new Date(subscription.subscriptionEndsAt).toLocaleDateString()}; it does not represent a payment.`
            : `Your subscription is active until ${new Date(subscription.subscriptionEndsAt).toLocaleDateString()}.`
          : subscription?.trialActive
            ? `You have ${getTrialTimeLeft(subscription.trialEndsAt)} on your free trial. Choose a plan whenever you’re ready.`
            : 'Your 24-hour free trial has ended. Select a plan below to activate a subscription.'}</p>
        {subscriptionError && <p className="subscription-error" role="alert">{subscriptionError}</p>}
        <button className="subscription-pay-button subscription-modal-cta" type="button" onClick={openSubscriptionPage}>View payment options <span aria-hidden="true">→</span></button>
        <button className="subscription-later" type="button" onClick={closeSubscription}>{subscription?.accessActive ? 'Maybe later' : 'Continue to workspace'}</button>
        <p className="subscription-security">Card payments verified by Razorpay · Demo QR/UPI are not real payments</p>
      </section>
    </div>
  )
}
