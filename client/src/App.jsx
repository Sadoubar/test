import { useState, useEffect } from 'react'

const API_URL = '/api'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [clientsRes, productsRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/invoices`)
      ])

      const clientsData = await clientsRes.json()
      const productsData = await productsRes.json()
      const invoicesData = await invoicesRes.json()

      setClients(clientsData)
      setProducts(productsData)
      setInvoices(invoicesData)
    } catch (err) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (message) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }

  const showError = (message) => {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Application de Facturation</h1>
        <p>Gérez vos clients, produits et factures en toute simplicité</p>
      </header>

      <nav className="nav">
        <button
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentView('dashboard')}
        >
          Tableau de bord
        </button>
        <button
          className={currentView === 'clients' ? 'active' : ''}
          onClick={() => setCurrentView('clients')}
        >
          Clients
        </button>
        <button
          className={currentView === 'products' ? 'active' : ''}
          onClick={() => setCurrentView('products')}
        >
          Produits
        </button>
        <button
          className={currentView === 'invoices' ? 'active' : ''}
          onClick={() => setCurrentView('invoices')}
        >
          Factures
        </button>
      </nav>

      <div className="container">
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {currentView === 'dashboard' && (
          <Dashboard
            clients={clients}
            products={products}
            invoices={invoices}
          />
        )}

        {currentView === 'clients' && (
          <ClientsView
            clients={clients}
            onUpdate={loadData}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {currentView === 'products' && (
          <ProductsView
            products={products}
            onUpdate={loadData}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {currentView === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            clients={clients}
            products={products}
            onUpdate={loadData}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}
      </div>
    </div>
  )
}

function Dashboard({ clients, products, invoices }) {
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length

  return (
    <div>
      <div className="stats">
        <div className="stat-card">
          <h3>Total Clients</h3>
          <div className="value">{clients.length}</div>
        </div>
        <div className="stat-card">
          <h3>Total Produits</h3>
          <div className="value">{products.length}</div>
        </div>
        <div className="stat-card">
          <h3>Factures En Attente</h3>
          <div className="value">{pendingInvoices}</div>
        </div>
        <div className="stat-card">
          <h3>Factures Payées</h3>
          <div className="value">{paidInvoices}</div>
        </div>
        <div className="stat-card">
          <h3>Chiffre d'Affaires</h3>
          <div className="value">{totalRevenue.toFixed(2)} €</div>
        </div>
      </div>

      <div className="section">
        <h2>Dernières Factures</h2>
        {invoices.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune facture</h3>
            <p>Créez votre première facture</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 5).map(invoice => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.client_name}</td>
                  <td>{invoice.issue_date}</td>
                  <td>{invoice.total.toFixed(2)} €</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      background: invoice.status === 'paid' ? '#d4edda' :
                                 invoice.status === 'pending' ? '#fff3cd' : '#f8d7da',
                      color: invoice.status === 'paid' ? '#155724' :
                             invoice.status === 'pending' ? '#856404' : '#721c24'
                    }}>
                      {invoice.status === 'paid' ? 'Payée' :
                       invoice.status === 'pending' ? 'En attente' : 'Brouillon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ClientsView({ clients, onUpdate, onSuccess, onError }) {
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: ''
    })
    setEditingClient(null)
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData(client)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingClient
        ? `${API_URL}/clients/${editingClient.id}`
        : `${API_URL}/clients`

      const method = editingClient ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess(editingClient ? 'Client mis à jour' : 'Client créé')
        setShowModal(false)
        resetForm()
        onUpdate()
      } else {
        onError('Erreur lors de la sauvegarde')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return

    try {
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSuccess('Client supprimé')
        onUpdate()
      } else {
        onError('Erreur lors de la suppression')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Gestion des Clients</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nouveau Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun client</h3>
          <p>Ajoutez votre premier client pour commencer</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Ville</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.email}</td>
                <td>{client.phone}</td>
                <td>{client.city}</td>
                <td className="actions">
                  <button className="btn btn-secondary" onClick={() => handleEdit(client)}>
                    Modifier
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(client.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClient ? 'Modifier le client' : 'Nouveau client'}</h3>
              <button className="close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ville</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Code Postal</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Pays</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {editingClient ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductsView({ products, onUpdate, onSuccess, onError }) {
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'unité'
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      unit: 'unité'
    })
    setEditingProduct(null)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData(product)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`

      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess(editingProduct ? 'Produit mis à jour' : 'Produit créé')
        setShowModal(false)
        resetForm()
        onUpdate()
      } else {
        onError('Erreur lors de la sauvegarde')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSuccess('Produit supprimé')
        onUpdate()
      } else {
        onError('Erreur lors de la suppression')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Gestion des Produits</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nouveau Produit
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <h3>Aucun produit</h3>
          <p>Ajoutez votre premier produit pour commencer</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Description</th>
              <th>Prix</th>
              <th>Unité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>{product.price.toFixed(2)} €</td>
                <td>{product.unit}</td>
                <td className="actions">
                  <button className="btn btn-secondary" onClick={() => handleEdit(product)}>
                    Modifier
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(product.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button className="close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Prix *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Unité</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {editingProduct ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoicesView({ invoices, clients, products, onUpdate, onSuccess, onError }) {
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: 20,
    discount: 0,
    status: 'draft',
    notes: '',
    items: []
  })

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      client_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      tax_rate: 20,
      discount: 0,
      status: 'draft',
      notes: '',
      items: []
    })
    setEditingInvoice(null)
  }

  const handleEdit = async (invoice) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoice.id}`)
      const data = await response.json()
      setEditingInvoice(data)
      setFormData({
        invoice_number: data.invoice_number,
        client_id: data.client_id,
        issue_date: data.issue_date,
        due_date: data.due_date || '',
        tax_rate: data.tax_rate,
        discount: data.discount,
        status: data.status,
        notes: data.notes || '',
        items: data.items
      })
      setShowModal(true)
    } catch (err) {
      onError('Erreur lors du chargement de la facture')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.items.length === 0) {
      onError('Ajoutez au moins un article')
      return
    }

    try {
      const url = editingInvoice
        ? `${API_URL}/invoices/${editingInvoice.id}`
        : `${API_URL}/invoices`

      const method = editingInvoice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess(editingInvoice ? 'Facture mise à jour' : 'Facture créée')
        setShowModal(false)
        resetForm()
        onUpdate()
      } else {
        onError('Erreur lors de la sauvegarde')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return

    try {
      const response = await fetch(`${API_URL}/invoices/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSuccess('Facture supprimée')
        onUpdate()
      } else {
        onError('Erreur lors de la suppression')
      }
    } catch (err) {
      onError('Erreur de connexion')
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, product_id: null }]
    })
  }

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value

    // Si on sélectionne un produit, remplir les champs
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product) {
        newItems[index].description = product.name
        newItems[index].unit_price = product.price
      }
    }

    setFormData({ ...formData, items: newItems })
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const afterDiscount = subtotal - (formData.discount || 0)
    const tax = afterDiscount * (formData.tax_rate / 100)
    return afterDiscount + tax
  }

  const downloadPDF = async (invoiceId) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      onError('Erreur lors du téléchargement du PDF')
    }
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Gestion des Factures</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nouvelle Facture
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune facture</h3>
          <p>Créez votre première facture</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>N° Facture</th>
              <th>Client</th>
              <th>Date</th>
              <th>Échéance</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.client_name}</td>
                <td>{invoice.issue_date}</td>
                <td>{invoice.due_date || '-'}</td>
                <td>{invoice.total.toFixed(2)} €</td>
                <td>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    background: invoice.status === 'paid' ? '#d4edda' :
                               invoice.status === 'pending' ? '#fff3cd' : '#f8d7da',
                    color: invoice.status === 'paid' ? '#155724' :
                           invoice.status === 'pending' ? '#856404' : '#721c24'
                  }}>
                    {invoice.status === 'paid' ? 'Payée' :
                     invoice.status === 'pending' ? 'En attente' : 'Brouillon'}
                  </span>
                </td>
                <td className="actions">
                  <button className="btn btn-success" onClick={() => downloadPDF(invoice.id)}>
                    PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleEdit(invoice)}>
                    Modifier
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(invoice.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>{editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}</h3>
              <button className="close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>N° Facture *</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date d'émission *</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date d'échéance</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Taux TVA (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Remise (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="draft">Brouillon</option>
                  <option value="pending">En attente</option>
                  <option value="paid">Payée</option>
                </select>
              </div>

              <div className="invoice-items">
                <h3>Articles</h3>
                {formData.items.map((item, index) => (
                  <div key={index} className="invoice-item">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Produit</label>
                      <select
                        value={item.product_id || ''}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Description *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Quantité *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Prix unitaire *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeItem(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addItem}>
                  Ajouter un article
                </button>
              </div>

              <div className="invoice-summary">
                <div className="invoice-summary-row">
                  <span>Sous-total:</span>
                  <span>{calculateSubtotal().toFixed(2)} €</span>
                </div>
                {formData.discount > 0 && (
                  <div className="invoice-summary-row">
                    <span>Remise:</span>
                    <span>-{formData.discount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="invoice-summary-row">
                  <span>TVA ({formData.tax_rate}%):</span>
                  <span>{((calculateSubtotal() - formData.discount) * (formData.tax_rate / 100)).toFixed(2)} €</span>
                </div>
                <div className="invoice-summary-row total">
                  <span>TOTAL:</span>
                  <span>{calculateTotal().toFixed(2)} €</span>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                {editingInvoice ? 'Mettre à jour' : 'Créer'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
