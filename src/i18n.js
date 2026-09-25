// ============================================================
// ManagerPresence PWA — Système de traduction i18n
// Langues : FR, EN, ES, DE, IT, PT
// ============================================================

const translations = {
  // ── App / Loading ──
  loading: { FR: 'Chargement...', EN: 'Loading...', ES: 'Cargando...', DE: 'Laden...', IT: 'Caricamento...', PT: 'Carregando...' },
  
  // ── Login ──
  login_title: { FR: 'Accès sécurisé depuis un ordinateur', EN: 'Secure access from a computer', ES: 'Acceso seguro desde un ordenador', DE: 'Sicherer Zugang vom Computer', IT: 'Accesso sicuro da computer', PT: 'Acesso seguro a partir de um computador' },
  login_code_label: { FR: "Code d'accès temporaire", EN: 'Temporary access code', ES: 'Código de acceso temporal', DE: 'Temporärer Zugangscode', IT: 'Codice di accesso temporaneo', PT: 'Código de acesso temporário' },
  login_btn: { FR: '🔐 Accéder', EN: '🔐 Access', ES: '🔐 Acceder', DE: '🔐 Zugriff', IT: '🔐 Accedi', PT: '🔐 Acessar' },
  login_verifying: { FR: 'Vérification...', EN: 'Verifying...', ES: 'Verificando...', DE: 'Überprüfung...', IT: 'Verifica...', PT: 'Verificando...' },
  login_help_title: { FR: '💡 Comment obtenir un code ?', EN: '💡 How to get a code?', ES: '💡 ¿Cómo obtener un código?', DE: '💡 Wie bekomme ich einen Code?', IT: '💡 Come ottenere un codice?', PT: '💡 Como obter um código?' },
  login_help_1: { FR: "Demandez à un <strong>administrateur</strong> de votre structure", EN: 'Ask an <strong>administrator</strong> of your organization', ES: 'Solicite a un <strong>administrador</strong> de su estructura', DE: 'Fragen Sie einen <strong>Administrator</strong> Ihrer Einrichtung', IT: 'Chiedete a un <strong>amministratore</strong> della vostra struttura', PT: 'Peça a um <strong>administrador</strong> da sua estrutura' },
  login_help_2: { FR: "Il génère le code depuis l'app mobile → <strong>Accès PWA</strong>", EN: 'They generate the code from the mobile app → <strong>PWA Access</strong>', ES: 'Genera el código desde la app móvil → <strong>Acceso PWA</strong>', DE: 'Er generiert den Code aus der mobilen App → <strong>PWA-Zugang</strong>', IT: 'Genera il codice dall\'app mobile → <strong>Accesso PWA</strong>', PT: 'Ele gera o código a partir do app móvel → <strong>Acesso PWA</strong>' },
  login_help_3: { FR: 'Le code est valable <strong>10 minutes</strong>', EN: 'The code is valid for <strong>10 minutes</strong>', ES: 'El código es válido durante <strong>10 minutos</strong>', DE: 'Der Code ist <strong>10 Minuten</strong> gültig', IT: 'Il codice è valido per <strong>10 minuti</strong>', PT: 'O código é válido por <strong>10 minutos</strong>' },
  login_plan_notice: { FR: 'Accès réservé aux licences', EN: 'Access reserved for licenses', ES: 'Acceso reservado para licencias', DE: 'Zugang reserviert für Lizenzen', IT: 'Accesso riservato alle licenze', PT: 'Acesso reservado para licenças' },
  login_error_invalid: { FR: 'Code invalide. Vérifiez le code et réessayez.', EN: 'Invalid code. Check the code and try again.', ES: 'Código inválido. Verifique el código e inténtelo de nuevo.', DE: 'Ungültiger Code. Überprüfen Sie den Code und versuchen Sie es erneut.', IT: 'Codice non valido. Controlla il codice e riprova.', PT: 'Código inválido. Verifique o código e tente novamente.' },
  login_error_expired: { FR: 'Code expiré. Demandez un nouveau code à votre administrateur.', EN: 'Code expired. Ask your administrator for a new code.', ES: 'Código expirado. Solicite un nuevo código a su administrador.', DE: 'Code abgelaufen. Bitten Sie Ihren Administrator um einen neuen Code.', IT: 'Codice scaduto. Chiedi un nuovo codice al tuo amministratore.', PT: 'Código expirado. Peça um novo código ao seu administrador.' },
  login_error_used: { FR: 'Ce code a déjà été utilisé.', EN: 'This code has already been used.', ES: 'Este código ya ha sido utilizado.', DE: 'Dieser Code wurde bereits verwendet.', IT: 'Questo codice è già stato utilizzato.', PT: 'Este código já foi utilizado.' },
  login_error_server: { FR: 'Impossible de contacter le serveur. Vérifiez votre connexion.', EN: 'Cannot reach the server. Check your connection.', ES: 'No se puede contactar al servidor. Verifique su conexión.', DE: 'Server nicht erreichbar. Überprüfen Sie Ihre Verbindung.', IT: 'Impossibile contattare il server. Controlla la connessione.', PT: 'Não é possível contactar o servidor. Verifique a sua ligação.' },

  // ── Navigation / Layout ──
  nav_dashboard: { FR: 'Tableau de bord', EN: 'Dashboard', ES: 'Panel de control', DE: 'Dashboard', IT: 'Dashboard', PT: 'Painel' },
  nav_presences: { FR: 'Présences', EN: 'Attendance', ES: 'Asistencias', DE: 'Anwesenheit', IT: 'Presenze', PT: 'Presenças' },
  nav_exports: { FR: 'Exports', EN: 'Exports', ES: 'Exportaciones', DE: 'Exporte', IT: 'Esportazioni', PT: 'Exportações' },
  nav_forum: { FR: 'Forum', EN: 'Forum', ES: 'Foro', DE: 'Forum', IT: 'Forum', PT: 'Fórum' },
  nav_audit: { FR: 'Audit', EN: 'Audit', ES: 'Auditoría', DE: 'Audit', IT: 'Audit', PT: 'Auditoria' },
  nav_settings: { FR: 'Paramètres', EN: 'Settings', ES: 'Configuración', DE: 'Einstellungen', IT: 'Impostazioni', PT: 'Configurações' },
  nav_logout: { FR: '🚪 Déconnexion', EN: '🚪 Logout', ES: '🚪 Cerrar sesión', DE: '🚪 Abmelden', IT: '🚪 Disconnetti', PT: '🚪 Sair' },
  licence_expires: { FR: 'jours restants', EN: 'days remaining', ES: 'días restantes', DE: 'Tage verbleibend', IT: 'giorni rimanenti', PT: 'dias restantes' },
  licence_expired: { FR: '❌ Licence expirée', EN: '❌ Licence expired', ES: '❌ Licencia expirada', DE: '❌ Lizenz abgelaufen', IT: '❌ Licenza scaduta', PT: '❌ Licença expirada' },
  connected_by: { FR: 'Connecté par', EN: 'Connected by', ES: 'Conectado por', DE: 'Verbunden durch', IT: 'Connesso da', PT: 'Conectado por' },

  // ── Dashboard ──
  dashboard_title: { FR: 'Tableau de bord', EN: 'Dashboard', ES: 'Panel de control', DE: 'Dashboard', IT: 'Dashboard', PT: 'Painel' },
  dashboard_welcome: { FR: 'Bienvenue sur', EN: 'Welcome to', ES: 'Bienvenido a', DE: 'Willkommen bei', IT: 'Benvenuto su', PT: 'Bem-vindo ao' },
  dashboard_members_registered: { FR: 'inscrits', EN: 'registered', ES: 'inscritos', DE: 'eingeschrieben', IT: 'iscritti', PT: 'inscritos' },
  dashboard_slots_active: { FR: 'actifs', EN: 'active', ES: 'activos', DE: 'aktiv', IT: 'attivi', PT: 'ativos' },
  dashboard_sessions_pointed: { FR: 'pointées', EN: 'recorded', ES: 'registradas', DE: 'erfasst', IT: 'registrate', PT: 'registadas' },
  dashboard_attendance_rate: { FR: 'Taux de présence moyen', EN: 'Average attendance rate', ES: 'Tasa de asistencia media', DE: 'Durchschnittliche Anwesenheitsrate', IT: 'Tasso di presenze medio', PT: 'Taxa de presença média' },
  dashboard_licence_info: { FR: '📋 Informations de licence', EN: '📋 Licence information', ES: '📋 Información de licencia', DE: '📋 Lizenzinformationen', IT: '📋 Informazioni licenza', PT: '📋 Informações de licença' },
  dashboard_plan: { FR: 'Plan', EN: 'Plan', ES: 'Plan', DE: 'Plan', IT: 'Piano', PT: 'Plano' },
  dashboard_days_left: { FR: 'Jours restants', EN: 'Days remaining', ES: 'Días restantes', DE: 'Verbleibende Tage', IT: 'Giorni rimanenti', PT: 'Dias restantes' },
  dashboard_expiry: { FR: 'Expiration', EN: 'Expiry', ES: 'Expiración', DE: 'Ablauf', IT: 'Scadenza', PT: 'Expiração' },
  dashboard_status: { FR: 'Statut', EN: 'Status', ES: 'Estado', DE: 'Status', IT: 'Stato', PT: 'Estado' },
  dashboard_active: { FR: '✅ Actif', EN: '✅ Active', ES: '✅ Activo', DE: '✅ Aktiv', IT: '✅ Attivo', PT: '✅ Ativo' },
  dashboard_expired: { FR: '❌ Expiré', EN: '❌ Expired', ES: '❌ Expirado', DE: '❌ Abgelaufen', IT: '❌ Scaduto', PT: '❌ Expirado' },
  dashboard_quick_actions: { FR: '⚡ Actions rapides', EN: '⚡ Quick actions', ES: '⚡ Acciones rápidas', DE: '⚡ Schnellaktionen', IT: '⚡ Azioni rapide', PT: '⚡ Ações rápidas' },
  dashboard_see_presences: { FR: '✅ Voir les présences', EN: '✅ View attendance', ES: '✅ Ver asistencias', DE: '✅ Anwesenheit ansehen', IT: '✅ Vedi presenze', PT: '✅ Ver presenças' },
  dashboard_manage_members: { FR: 'Gérer les', EN: 'Manage', ES: 'Gestionar los', DE: 'Verwalten', IT: 'Gestisci i', PT: 'Gerir os' },
  dashboard_export_data: { FR: '📤 Exporter les données', EN: '📤 Export data', ES: '📤 Exportar datos', DE: '📤 Daten exportieren', IT: '📤 Esporta dati', PT: '📤 Exportar dados' },

  // ── Common ──
  save: { FR: 'Enregistrer', EN: 'Save', ES: 'Guardar', DE: 'Speichern', IT: 'Salva', PT: 'Guardar' },
  cancel: { FR: 'Annuler', EN: 'Cancel', ES: 'Cancelar', DE: 'Abbrechen', IT: 'Annulla', PT: 'Cancelar' },
  delete: { FR: 'Supprimer', EN: 'Delete', ES: 'Eliminar', DE: 'Löschen', IT: 'Elimina', PT: 'Eliminar' },
  edit: { FR: 'Modifier', EN: 'Edit', ES: 'Editar', DE: 'Bearbeiten', IT: 'Modifica', PT: 'Editar' },
  add: { FR: 'Ajouter', EN: 'Add', ES: 'Agregar', DE: 'Hinzufügen', IT: 'Aggiungi', PT: 'Adicionar' },
  search: { FR: 'Rechercher', EN: 'Search', ES: 'Buscar', DE: 'Suchen', IT: 'Cerca', PT: 'Pesquisar' },
  close: { FR: 'Fermer', EN: 'Close', ES: 'Cerrar', DE: 'Schließen', IT: 'Chiudi', PT: 'Fechar' },
  confirm: { FR: 'Confirmer', EN: 'Confirm', ES: 'Confirmar', DE: 'Bestätigen', IT: 'Conferma', PT: 'Confirmar' },
  yes: { FR: 'Oui', EN: 'Yes', ES: 'Sí', DE: 'Ja', IT: 'Sì', PT: 'Sim' },
  no: { FR: 'Non', EN: 'No', ES: 'No', DE: 'Nein', IT: 'No', PT: 'Não' },
  loading_data: { FR: 'Chargement...', EN: 'Loading...', ES: 'Cargando...', DE: 'Laden...', IT: 'Caricamento...', PT: 'Carregando...' },
  error: { FR: 'Erreur', EN: 'Error', ES: 'Error', DE: 'Fehler', IT: 'Errore', PT: 'Erro' },
  success: { FR: 'Succès', EN: 'Success', ES: 'Éxito', DE: 'Erfolg', IT: 'Successo', PT: 'Sucesso' },
  name: { FR: 'Nom', EN: 'Name', ES: 'Nombre', DE: 'Name', IT: 'Nome', PT: 'Nome' },
  firstname: { FR: 'Prénom', EN: 'First name', ES: 'Nombre', DE: 'Vorname', IT: 'Nome', PT: 'Nome próprio' },
  email: { FR: 'Email', EN: 'Email', ES: 'Email', DE: 'E-Mail', IT: 'Email', PT: 'Email' },
  phone: { FR: 'Téléphone', EN: 'Phone', ES: 'Teléfono', DE: 'Telefon', IT: 'Telefono', PT: 'Telefone' },
  date: { FR: 'Date', EN: 'Date', ES: 'Fecha', DE: 'Datum', IT: 'Data', PT: 'Data' },
  actions: { FR: 'Actions', EN: 'Actions', ES: 'Acciones', DE: 'Aktionen', IT: 'Azioni', PT: 'Ações' },
  no_data: { FR: 'Aucune donnée', EN: 'No data', ES: 'Sin datos', DE: 'Keine Daten', IT: 'Nessun dato', PT: 'Sem dados' },
  present: { FR: 'Présent', EN: 'Present', ES: 'Presente', DE: 'Anwesend', IT: 'Presente', PT: 'Presente' },
  absent: { FR: 'Absent', EN: 'Absent', ES: 'Ausente', DE: 'Abwesend', IT: 'Assente', PT: 'Ausente' },
  justified: { FR: 'Justifié', EN: 'Justified', ES: 'Justificado', DE: 'Entschuldigt', IT: 'Giustificato', PT: 'Justificado' },
  
  // ── Membres ──
  members_title: { FR: 'Membres', EN: 'Members', ES: 'Miembros', DE: 'Mitglieder', IT: 'Membri', PT: 'Membros' },
  members_add: { FR: 'Ajouter un membre', EN: 'Add a member', ES: 'Agregar un miembro', DE: 'Mitglied hinzufügen', IT: 'Aggiungi membro', PT: 'Adicionar membro' },
  members_search: { FR: 'Rechercher un membre...', EN: 'Search for a member...', ES: 'Buscar un miembro...', DE: 'Mitglied suchen...', IT: 'Cerca un membro...', PT: 'Pesquisar membro...' },
  members_none: { FR: 'Aucun membre inscrit', EN: 'No members registered', ES: 'Ningún miembro registrado', DE: 'Keine Mitglieder eingeschrieben', IT: 'Nessun membro iscritto', PT: 'Nenhum membro inscrito' },
  members_active: { FR: 'Actifs', EN: 'Active', ES: 'Activos', DE: 'Aktiv', IT: 'Attivi', PT: 'Ativos' },
  members_inactive: { FR: 'Inactifs', EN: 'Inactive', ES: 'Inactivos', DE: 'Inaktiv', IT: 'Inattivi', PT: 'Inativos' },
  members_all: { FR: 'Tous', EN: 'All', ES: 'Todos', DE: 'Alle', IT: 'Tutti', PT: 'Todos' },

  // ── Créneaux ──
  slots_title: { FR: 'Créneaux', EN: 'Time slots', ES: 'Horarios', DE: 'Zeitfenster', IT: 'Fasce orarie', PT: 'Horários' },
  slots_add: { FR: 'Ajouter un créneau', EN: 'Add a time slot', ES: 'Agregar un horario', DE: 'Zeitfenster hinzufügen', IT: 'Aggiungi fascia oraria', PT: 'Adicionar horário' },
  slots_none: { FR: 'Aucun créneau créé', EN: 'No time slots created', ES: 'Ningún horario creado', DE: 'Keine Zeitfenster erstellt', IT: 'Nessuna fascia oraria creata', PT: 'Nenhum horário criado' },
  slots_days: {
    FR: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    EN: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ES: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    DE: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    IT: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
    PT: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  },

  // ── Présences ──
  presences_title: { FR: 'Présences', EN: 'Attendance', ES: 'Asistencias', DE: 'Anwesenheit', IT: 'Presenze', PT: 'Presenças' },
  presences_select_slot: { FR: 'Sélectionnez un créneau', EN: 'Select a time slot', ES: 'Seleccione un horario', DE: 'Zeitfenster auswählen', IT: 'Seleziona una fascia oraria', PT: 'Selecione um horário' },
  presences_select_date: { FR: 'Sélectionnez une date', EN: 'Select a date', ES: 'Seleccione una fecha', DE: 'Datum auswählen', IT: 'Seleziona una data', PT: 'Selecione uma data' },
  presences_mark_all_present: { FR: 'Tous présents', EN: 'Mark all present', ES: 'Todos presentes', DE: 'Alle anwesend', IT: 'Tutti presenti', PT: 'Todos presentes' },
  presences_validate: { FR: 'Valider la séance', EN: 'Validate session', ES: 'Validar sesión', DE: 'Sitzung bestätigen', IT: 'Valida sessione', PT: 'Validar sessão' },
  presences_validated: { FR: '✅ Séance validée', EN: '✅ Session validated', ES: '✅ Sesión validada', DE: '✅ Sitzung bestätigt', IT: '✅ Sessione validata', PT: '✅ Sessão validada' },
  presences_saved: { FR: 'Présences enregistrées', EN: 'Attendance saved', ES: 'Asistencias guardadas', DE: 'Anwesenheit gespeichert', IT: 'Presenze salvate', PT: 'Presenças guardadas' },
  presences_no_members: { FR: 'Aucun membre dans ce créneau', EN: 'No members in this time slot', ES: 'Ningún miembro en este horario', DE: 'Keine Mitglieder in diesem Zeitfenster', IT: 'Nessun membro in questa fascia oraria', PT: 'Nenhum membro neste horário' },

  // ── Dates / Séances ──
  dates_title: { FR: 'Dates', EN: 'Dates', ES: 'Fechas', DE: 'Daten', IT: 'Date', PT: 'Datas' },
  dates_add: { FR: 'Ajouter une date', EN: 'Add a date', ES: 'Agregar una fecha', DE: 'Datum hinzufügen', IT: 'Aggiungi data', PT: 'Adicionar data' },
  dates_none: { FR: 'Aucune date enregistrée', EN: 'No dates recorded', ES: 'Ninguna fecha registrada', DE: 'Keine Daten aufgezeichnet', IT: 'Nessuna data registrata', PT: 'Nenhuma data registada' },

  // ── Cadres ──
  cadres_title: { FR: 'Cadres', EN: 'Staff', ES: 'Personal', DE: 'Personal', IT: 'Staff', PT: 'Responsáveis' },
  cadres_add: { FR: 'Ajouter un cadre', EN: 'Add a staff member', ES: 'Agregar personal', DE: 'Personal hinzufügen', IT: 'Aggiungi membro staff', PT: 'Adicionar responsável' },
  cadres_none: { FR: 'Aucun cadre enregistré', EN: 'No staff members registered', ES: 'Ningún personal registrado', DE: 'Kein Personal eingeschrieben', IT: 'Nessun membro staff iscritto', PT: 'Nenhum responsável registado' },
  cadres_role_admin: { FR: 'Administrateur', EN: 'Administrator', ES: 'Administrador', DE: 'Administrator', IT: 'Amministratore', PT: 'Administrador' },
  cadres_role_cadre: { FR: 'Cadre', EN: 'Staff', ES: 'Personal', DE: 'Personal', IT: 'Staff', PT: 'Responsável' },

  // ── Export ──
  export_title: { FR: 'Exports', EN: 'Exports', ES: 'Exportaciones', DE: 'Exporte', IT: 'Esportazioni', PT: 'Exportações' },
  export_csv: { FR: 'Exporter en CSV', EN: 'Export as CSV', ES: 'Exportar como CSV', DE: 'Als CSV exportieren', IT: 'Esporta come CSV', PT: 'Exportar como CSV' },
  export_pdf: { FR: 'Exporter en PDF', EN: 'Export as PDF', ES: 'Exportar como PDF', DE: 'Als PDF exportieren', IT: 'Esporta come PDF', PT: 'Exportar como PDF' },
  export_presences: { FR: 'Exporter les présences', EN: 'Export attendance', ES: 'Exportar asistencias', DE: 'Anwesenheit exportieren', IT: 'Esporta presenze', PT: 'Exportar presenças' },
  export_members: { FR: 'Exporter les membres', EN: 'Export members', ES: 'Exportar miembros', DE: 'Mitglieder exportieren', IT: 'Esporta membri', PT: 'Exportar membros' },
  export_period: { FR: 'Période', EN: 'Period', ES: 'Período', DE: 'Zeitraum', IT: 'Periodo', PT: 'Período' },
  export_from: { FR: 'Du', EN: 'From', ES: 'Desde', DE: 'Von', IT: 'Dal', PT: 'De' },
  export_to: { FR: 'Au', EN: 'To', ES: 'Hasta', DE: 'Bis', IT: 'Al', PT: 'Até' },
  export_download: { FR: 'Télécharger', EN: 'Download', ES: 'Descargar', DE: 'Herunterladen', IT: 'Scarica', PT: 'Transferir' },

  // ── Forum ──
  forum_title: { FR: 'Forum', EN: 'Forum', ES: 'Foro', DE: 'Forum', IT: 'Forum', PT: 'Fórum' },
  forum_new_message: { FR: 'Nouveau message', EN: 'New message', ES: 'Nuevo mensaje', DE: 'Neue Nachricht', IT: 'Nuovo messaggio', PT: 'Nova mensagem' },
  forum_send: { FR: 'Envoyer', EN: 'Send', ES: 'Enviar', DE: 'Senden', IT: 'Invia', PT: 'Enviar' },
  forum_no_messages: { FR: 'Aucun message', EN: 'No messages', ES: 'Ningún mensaje', DE: 'Keine Nachrichten', IT: 'Nessun messaggio', PT: 'Sem mensagens' },
  forum_write: { FR: 'Écrire un message...', EN: 'Write a message...', ES: 'Escribir un mensaje...', DE: 'Nachricht schreiben...', IT: 'Scrivi un messaggio...', PT: 'Escrever uma mensagem...' },

  // ── Audit ──
  audit_title: { FR: 'Audit', EN: 'Audit', ES: 'Auditoría', DE: 'Audit', IT: 'Audit', PT: 'Auditoria' },
  audit_filter: { FR: 'Filtrer', EN: 'Filter', ES: 'Filtrar', DE: 'Filtern', IT: 'Filtra', PT: 'Filtrar' },
  audit_all_actions: { FR: 'Toutes les actions', EN: 'All actions', ES: 'Todas las acciones', DE: 'Alle Aktionen', IT: 'Tutte le azioni', PT: 'Todas as ações' },
  audit_no_logs: { FR: 'Aucun journal', EN: 'No audit logs', ES: 'Sin registros', DE: 'Keine Protokolle', IT: 'Nessun registro', PT: 'Sem registos' },
  audit_action: { FR: 'Action', EN: 'Action', ES: 'Acción', DE: 'Aktion', IT: 'Azione', PT: 'Ação' },
  audit_user: { FR: 'Utilisateur', EN: 'User', ES: 'Usuario', DE: 'Benutzer', IT: 'Utente', PT: 'Utilizador' },

  // ── Paramètres ──
  settings_title: { FR: 'Paramètres', EN: 'Settings', ES: 'Configuración', DE: 'Einstellungen', IT: 'Impostazioni', PT: 'Configurações' },
  settings_language: { FR: 'Langue', EN: 'Language', ES: 'Idioma', DE: 'Sprache', IT: 'Lingua', PT: 'Idioma' },
  settings_language_desc: { FR: 'Choisissez la langue de la PWA', EN: 'Choose the PWA language', ES: 'Elija el idioma de la PWA', DE: 'Wählen Sie die Sprache der PWA', IT: 'Scegli la lingua della PWA', PT: 'Escolha o idioma da PWA' },
  settings_su_password: { FR: 'Mot de passe Super Utilisateur', EN: 'Super User password', ES: 'Contraseña de Super Usuario', DE: 'Super-Benutzer-Passwort', IT: 'Password Super Utente', PT: 'Palavra-passe Super Utilizador' },
  settings_current_password: { FR: 'Mot de passe actuel', EN: 'Current password', ES: 'Contraseña actual', DE: 'Aktuelles Passwort', IT: 'Password attuale', PT: 'Palavra-passe atual' },
  settings_new_password: { FR: 'Nouveau mot de passe', EN: 'New password', ES: 'Nueva contraseña', DE: 'Neues Passwort', IT: 'Nuova password', PT: 'Nova palavra-passe' },
  settings_confirm_password: { FR: 'Confirmer le mot de passe', EN: 'Confirm password', ES: 'Confirmar contraseña', DE: 'Passwort bestätigen', IT: 'Conferma password', PT: 'Confirmar palavra-passe' },
  settings_su_access: { FR: 'Accès super utilisateur', EN: 'Super user access', ES: 'Acceso de super usuario', DE: 'Super-Benutzer-Zugang', IT: 'Accesso super utente', PT: 'Acesso super utilizador' },
  settings_su_enter: { FR: 'Entrez le mot de passe SU pour accéder', EN: 'Enter SU password to access', ES: 'Ingrese la contraseña SU para acceder', DE: 'SU-Passwort eingeben', IT: 'Inserisci la password SU per accedere', PT: 'Introduza a palavra-passe SU para aceder' },
  settings_su_unlock: { FR: '🔓 Déverrouiller', EN: '🔓 Unlock', ES: '🔓 Desbloquear', DE: '🔓 Entsperren', IT: '🔓 Sblocca', PT: '🔓 Desbloquear' },
  settings_logo: { FR: 'Logo du club', EN: 'Club logo', ES: 'Logo del club', DE: 'Vereinslogo', IT: 'Logo del club', PT: 'Logotipo do clube' },
  settings_upload_logo: { FR: 'Choisir un logo', EN: 'Choose a logo', ES: 'Elegir un logo', DE: 'Logo auswählen', IT: 'Scegli un logo', PT: 'Escolher logotipo' },
  settings_delete_logo: { FR: 'Supprimer le logo', EN: 'Delete logo', ES: 'Eliminar logo', DE: 'Logo löschen', IT: 'Elimina logo', PT: 'Eliminar logotipo' },
  settings_absence_msg: { FR: "Message d'absence SMS", EN: 'SMS absence message', ES: 'Mensaje de ausencia SMS', DE: 'SMS-Abwesenheitsnachricht', IT: 'Messaggio assenza SMS', PT: 'Mensagem de ausência SMS' },
  settings_save_msg: { FR: 'Enregistrer le message', EN: 'Save message', ES: 'Guardar mensaje', DE: 'Nachricht speichern', IT: 'Salva messaggio', PT: 'Guardar mensagem' },
  settings_wrong_password: { FR: 'Mot de passe incorrect', EN: 'Incorrect password', ES: 'Contraseña incorrecta', DE: 'Falsches Passwort', IT: 'Password errata', PT: 'Palavra-passe incorreta' },
  settings_password_changed: { FR: 'Mot de passe SU modifié', EN: 'SU password changed', ES: 'Contraseña SU cambiada', DE: 'SU-Passwort geändert', IT: 'Password SU modificata', PT: 'Palavra-passe SU alterada' },
  settings_passwords_differ: { FR: 'Mots de passe différents', EN: 'Passwords do not match', ES: 'Las contraseñas no coinciden', DE: 'Passwörter stimmen nicht überein', IT: 'Le password non corrispondono', PT: 'As palavras-passe não coincidem' },
  settings_min_chars: { FR: 'Minimum 4 caractères', EN: 'Minimum 4 characters', ES: 'Mínimo 4 caracteres', DE: 'Mindestens 4 Zeichen', IT: 'Minimo 4 caratteri', PT: 'Mínimo 4 caracteres' },
  settings_logo_updated: { FR: 'Logo mis à jour', EN: 'Logo updated', ES: 'Logo actualizado', DE: 'Logo aktualisiert', IT: 'Logo aggiornato', PT: 'Logotipo atualizado' },
  settings_logo_deleted: { FR: 'Logo supprimé', EN: 'Logo deleted', ES: 'Logo eliminado', DE: 'Logo gelöscht', IT: 'Logo eliminato', PT: 'Logotipo eliminado' },
  settings_su_granted: { FR: 'Accès autorisé', EN: 'Access granted', ES: 'Acceso autorizado', DE: 'Zugang gewährt', IT: 'Accesso autorizzato', PT: 'Acesso autorizado' },
}

// Détecter la langue depuis localStorage ou navigator
function detectLanguage() {
  const saved = localStorage.getItem('mp_pwa_lang')
  if (saved && translations.loading[saved]) return saved
  const nav = navigator.language?.substring(0, 2)?.toUpperCase()
  const supported = ['FR', 'EN', 'ES', 'DE', 'IT', 'PT']
  return supported.includes(nav) ? nav : 'FR'
}

let currentLang = detectLanguage()

export function getLang() { return currentLang }

export function setLang(lang) {
  currentLang = lang
  localStorage.setItem('mp_pwa_lang', lang)
  window.dispatchEvent(new Event('mp_lang_changed'))
}

export function t(key) {
  const entry = translations[key]
  if (!entry) { console.warn(`[i18n] Clé manquante: ${key}`); return key }
  return entry[currentLang] || entry['FR'] || key
}

export function tDays() {
  const entry = translations['slots_days']
  return entry[currentLang] || entry['FR']
}

export const LANGUAGES = [
  { code: 'FR', label: '🇫🇷 Français' },
  { code: 'EN', label: '🇬🇧 English' },
  { code: 'ES', label: '🇪🇸 Español' },
  { code: 'DE', label: '🇩🇪 Deutsch' },
  { code: 'IT', label: '🇮🇹 Italiano' },
  { code: 'PT', label: '🇵🇹 Português' },
]

export default { t, tDays, getLang, setLang, LANGUAGES }
