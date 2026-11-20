import { getTrialTimeLeft, subscriptionPlans } from './plans'

export default function SubscriptionPage({
  subscription,
  selectedPlan,
  setSelectedPlan,
  paymentMethod,
  setPaymentMethod,
  qrPayment,
  setQrPayment,
  countdown,
  buyingPlan,
  subscriptionError,
  startSubscription,
  createQrPayment,
}) {
  const currentPlan = subscriptionPlans.find((plan) => plan.id === selectedPlan)

  return (
    <section className="subscription-page">
      <header className="subscription-page-heading">
        <div><p className="subscription-kicker">MEMBERSHIP & BILLING</p><h1>Choose your subscription</h1><p>Keep your resume workspace ready whenever a new opportunity comes along.</p></div>
        <div className={`subscription-status-badge ${subscription?.accessActive ? 'is-active' : 'is-expired'} ${subscription?.demoSubscription ? 'is-demo' : ''}`}><i />{subscription?.demoSubscription ? 'Demo subscription · not paid' : subscription?.subscriptionActive ? 'Subscription active' : subscription?.trialActive ? `Free trial · ${getTrialTimeLeft(subscription.trialEndsAt)}` : 'Free trial ended'}</div>
      </header>
      {subscription?.subscriptionActive && <div className={`subscription-active-banner ${subscription.demoSubscription ? 'is-demo' : ''}`}><span aria-hidden="true">{subscription.demoSubscription ? 'i' : '✓'}</span><div><strong>{subscription.demoSubscription ? 'Demo access only' : 'You’re subscribed'}</strong><small>{subscription.demoSubscription ? 'Not a payment · ' : ''}Active until {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}</small></div></div>}
      <div className="subscription-page-grid">
        <section className="subscription-selection-card" aria-labelledby="plan-selection-heading">
          <div className="subscription-section-heading"><div><h2 id="plan-selection-heading">Select a plan</h2><p>All prices are in Indian rupees (INR).</p></div><span className="subscription-secure-label">◇ Secure checkout</span></div>
          <div className="subscription-plan-grid">
            {subscriptionPlans.map((plan) => <button className={`subscription-choice ${selectedPlan === plan.id ? 'selected' : ''} ${plan.featured ? 'featured' : ''}`} type="button" key={plan.id} aria-pressed={selectedPlan === plan.id} onClick={() => { setSelectedPlan(plan.id); setQrPayment(null) }}>
              {plan.featured && <span className="subscription-choice-badge">BEST VALUE</span>}
              <span className="subscription-choice-radio" aria-hidden="true">{selectedPlan === plan.id ? '✓' : ''}</span>
              <strong>{plan.duration}</strong>
              <span className="subscription-choice-price">₹{plan.price}<small> / plan</small></span>
            </button>)}
          </div>
          <div className="payment-method-section">
            <div className="subscription-section-heading"><div><h2>Payment method</h2><p>Choose how you’d like to pay.</p></div></div>
            <div className="payment-method-options" role="group" aria-label="Payment method">
              <button type="button" className={paymentMethod === 'card' ? 'selected' : ''} aria-pressed={paymentMethod === 'card'} onClick={() => { setPaymentMethod('card'); setQrPayment(null) }}><span aria-hidden="true">▰</span><strong>Card</strong><small>Razorpay</small></button>
              <button type="button" className={paymentMethod === 'upi' ? 'selected' : ''} aria-pressed={paymentMethod === 'upi'} onClick={() => { setPaymentMethod('upi'); setQrPayment(null) }}><span aria-hidden="true">↗</span><strong>UPI</strong><small>Razorpay</small></button>
              <button type="button" className={paymentMethod === 'qr' ? 'selected' : ''} aria-pressed={paymentMethod === 'qr'} onClick={() => { setPaymentMethod('qr'); setQrPayment(null) }}><span aria-hidden="true">▦</span><strong>QR pay</strong><small>Razorpay</small></button>
            </div>
            {paymentMethod === 'card' ? (
              <div className="payment-action-panel">
                <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Pay securely with Razorpay</strong><small>Card details are entered only in Razorpay Checkout.</small></div></div>
                {!subscription?.razorpayKeyId && <p className="subscription-setup-note">Card checkout needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the API environment.</p>}
                <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={() => startSubscription(selectedPlan, 'card')}>{buyingPlan ? 'Opening secure checkout…' : `Pay ₹${currentPlan?.price} with Razorpay`}</button>
              </div>
            ) : paymentMethod === 'upi' ? (
              <div className="payment-action-panel">
                <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Pay with UPI via Razorpay</strong><small>Continue to Razorpay Checkout to use a supported UPI app.</small></div></div>
                {!subscription?.razorpayKeyId && <p className="subscription-setup-note">UPI checkout needs Razorpay API credentials configured on the API.</p>}
                <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={() => startSubscription(selectedPlan, 'upi')}>{buyingPlan ? 'Opening secure checkout…' : `Pay ₹${currentPlan?.price} with UPI`}</button>
              </div>
            ) : (
              <div className="qr-payment-panel">
                {qrPayment ? (
                  <div className={`qr-payment-details ${qrPayment.status === 'expired' ? 'expired' : ''}`}>
                    {qrPayment.status === 'completed'
                      ? <div className="qr-payment-success"><span aria-hidden="true">✓</span><strong>Payment verified</strong><small>Your subscription is active.</small></div>
                      : <>
                        {qrPayment.status === 'pending' && <img className="razorpay-payment-qr" src={qrPayment.imageUrl} alt="Razorpay UPI payment QR code" />}
                        <strong>{qrPayment.status === 'expired' ? 'QR code expired' : qrPayment.status === 'failed' ? 'QR code could not be created' : `₹${(qrPayment.amountPaise / 100).toFixed(2)} · ${countdown}s remaining`}</strong>
                        {qrPayment.status === 'pending' && <span>Scan with a UPI app to pay securely.</span>}
                        {qrPayment.status === 'expired' && <button className="subscription-pay-button" type="button" onClick={createQrPayment}>Generate a new QR code</button>}
                      </>}
                  </div>
                ) : (
                  <>
                    <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Razorpay UPI QR</strong><small>A single-use QR code for the selected plan.</small></div></div>
                    {!subscription?.razorpayKeyId && <p className="subscription-setup-note">QR payments need Razorpay API credentials configured on the API.</p>}
                    <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={createQrPayment}>Generate secure QR code</button>
                  </>
                )}
              </div>
            )}
            {subscriptionError && <p className="subscription-error" role="alert">{subscriptionError}</p>}
            <p className="subscription-security">Payments are verified with Razorpay before your subscription is activated. Razorpay QR Codes must be enabled for your merchant account.</p>
          </div>
        </section>
        <aside className="subscription-summary-card">
          <div className="summary-card-top"><span aria-hidden="true">✦</span><p>YOUR SUBSCRIPTION</p><h2>Resume insights, on your terms.</h2><small>Secure your workspace and keep your saved reports close.</small></div>
          <div className="summary-selected-plan"><span>{currentPlan?.duration} plan</span><strong>₹{currentPlan?.price}</strong></div>
          <ul><li><span>✓</span>Personal resume analysis workspace</li><li><span>✓</span>Saved reports and history</li><li><span>✓</span>Actionable role-matching insights</li></ul>
          <p className="summary-cancel-note">One-time payment for the selected period. No recurring auto-renewal.</p>
        </aside>
      </div>
    </section>
  )
}
