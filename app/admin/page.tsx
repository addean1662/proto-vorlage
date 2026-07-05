export const metadata = {
  title: 'Admin - Proto-Vorlage',
  description: 'Administrative cache and review tools for Proto-Vorlage.',
};

export default function AdminPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0c0a07', color: '#d4c4a8', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(200,180,150,.45)', marginBottom: 8 }}>
          Proto-Vorlage Admin
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 400, margin: '0 0 18px' }}>Cache and Review Operations</h1>
        <section style={{ border: '1px solid rgba(200,170,120,.14)', borderRadius: 8, padding: 18, background: 'rgba(200,170,120,.035)' }}>
          <p style={{ marginTop: 0, lineHeight: 1.7, color: 'rgba(220,205,175,.76)' }}>
            Admin APIs require the <code>x-cache-admin-secret</code> header. Keep the secret out of URLs and logs.
          </p>
          <pre style={{ overflowX: 'auto', padding: 14, borderRadius: 6, background: '#14100b', color: 'rgba(220,205,175,.8)', lineHeight: 1.6 }}>
{`GET /api/admin
POST /api/admin
  {"ref":"Genesis 1:1","status":"reviewed","reviewer":"name","note":"checked against source"}
DELETE /api/admin?ref=Genesis%201:1`}
          </pre>
          <p style={{ marginBottom: 0, lineHeight: 1.7, color: 'rgba(220,205,175,.58)' }}>
            Review metadata is stored separately from cached generated verses, so editorial decisions can be updated without regenerating an alignment.
          </p>
        </section>
      </div>
    </main>
  );
}
