// category-catalog.mjs
var action = (label, target) => ({ label, target });
var controlPanelCategories = {
  system: { title: "System und Sicherheit", icon: "/icons/control-panel/system.png", groups: [
    { title: "Wartungscenter", items: [action("Status des Computers \xFCberpr\xFCfen", "maintenance"), action("Einstellungen der Benutzerkontensteuerung \xE4ndern", "uac"), action("Probleme erkennen und beheben", "troubleshooting")] },
    { title: "Windows-Firewall", items: [action("Firewallstatus \xFCberpr\xFCfen", "firewall"), action("Programm \xFCber die Windows-Firewall kommunizieren lassen", "firewall-apps")] },
    { title: "System", items: [action("Arbeitsspeicher und Prozessorgeschwindigkeit anzeigen", "system-info"), action("Remotezugriff zulassen", "remote-access"), action("Computernamen anzeigen", "system-info")] },
    { title: "Windows Update", items: [action("Automatische Updates aktivieren oder deaktivieren", "windows-update"), action("Installierte Updates anzeigen", "installed-updates")] },
    { title: "Energieoptionen", items: [action("Energiesparmodus \xE4ndern", "power"), action("Energieoptionen \xE4ndern", "power")] },
    { title: "Sichern und Wiederherstellen", items: [action("Sicherung des Computers erstellen", "backup"), action("Dateien aus einer Sicherung wiederherstellen", "restore")] },
    { title: "Verwaltung", items: [action("Festplattenpartitionen erstellen und formatieren", "disk-management"), action("Ereignisprotokolle anzeigen", "event-viewer")] }
  ] },
  network: { title: "Netzwerk und Internet", icon: "/icons/control-panel/network.png", groups: [
    { title: "Netzwerk- und Freigabecenter", items: [action("Netzwerkstatus und -aufgaben anzeigen", "network-center"), action("Verbindung mit einem Netzwerk herstellen", "connect-network"), action("Heimnetzgruppen- und Freigabeoptionen ausw\xE4hlen", "sharing")] },
    { title: "Heimnetzgruppe", items: [action("Kennwort f\xFCr die Heimnetzgruppe anzeigen", "homegroup"), action("Erweiterte Freigabeeinstellungen \xE4ndern", "sharing")] },
    { title: "Internetoptionen", items: [action("Startseite \xE4ndern", "internet-options"), action("Browser-Add-Ons verwalten", "internet-options"), action("Browserverlauf und Cookies l\xF6schen", "internet-options")] }
  ] },
  hardware: { title: "Hardware und Sound", icon: "/icons/control-panel/hardware.png", groups: [
    { title: "Ger\xE4te und Drucker", items: [action("Ger\xE4te und Drucker anzeigen", "devices"), action("Ger\xE4t hinzuf\xFCgen", "add-device"), action("Erweiterte Druckereinrichtung", "printers")] },
    { title: "Automatische Wiedergabe", items: [action("Medien oder Ger\xE4te automatisch wiedergeben", "autoplay")] },
    { title: "Sound", items: [action("Lautst\xE4rke anpassen", "sound"), action("Audioger\xE4te verwalten", "sound"), action("Systemkl\xE4nge \xE4ndern", "sound")] },
    { title: "Energieoptionen", items: [action("Energiesparmodus \xE4ndern", "power")] },
    { title: "Anzeige", items: [action("Bildschirmaufl\xF6sung anpassen", "display")] }
  ] },
  programs: { title: "Programme", icon: "/icons/control-panel/programs.png", groups: [
    { title: "Programme und Funktionen", items: [action("Programm deinstallieren", "programs"), action("Installierte Updates anzeigen", "installed-updates"), action("Windows-Funktionen aktivieren oder deaktivieren", "windows-features")] },
    { title: "Standardprogramme", items: [action("Standardprogramme festlegen", "default-programs"), action("Dateityp immer mit einem bestimmten Programm \xF6ffnen", "file-associations"), action("Einstellungen f\xFCr automatische Wiedergabe \xE4ndern", "autoplay")] },
    { title: "Desktopgadgets", items: [action("Desktopgadgets anzeigen und verwalten", "gadgets")] }
  ] },
  accounts: { title: "Benutzerkonten und Jugendschutz", icon: "/icons/control-panel/accounts.png", groups: [
    { title: "Benutzerkonten", items: [action("Benutzerkonten hinzuf\xFCgen oder entfernen", "accounts"), action("Kontotyp \xE4ndern", "accounts"), action("Anmeldekennwort \xE4ndern", "accounts")] },
    { title: "Anmeldeinformationsverwaltung", items: [action("Web- und Windows-Anmeldeinformationen verwalten", "credentials")] },
    { title: "Jugendschutz", items: [action("Jugendschutz f\xFCr beliebige Benutzer einrichten", "parental-controls")] }
  ] },
  appearance: { title: "Darstellung und Anpassung", icon: "/icons/control-panel/appearance.png", groups: [
    { title: "Anpassung", items: [action("Design \xE4ndern", "background"), action("Desktophintergrund \xE4ndern", "wallpapers"), action("Fensterfarben \xE4ndern", "colors"), action("Bildschirmschoner \xE4ndern", "screensaver")] },
    { title: "Anzeige", items: [action("Text und andere Elemente vergr\xF6\xDFern oder verkleinern", "display"), action("Bildschirmaufl\xF6sung anpassen", "display"), action("Anzeigeger\xE4te verbinden", "display")] },
    { title: "Taskleiste und Startmen\xFC", items: [action("Taskleiste anpassen", "taskbar")] },
    { title: "Center f\xFCr erleichterte Bedienung", items: [action("Visuelle Darstellung des Bildschirms optimieren", "access")] }
  ] },
  region: { title: "Zeit, Sprache und Region", icon: "/icons/control-panel/region.png", groups: [
    { title: "Datum und Uhrzeit", items: [action("Datum und Uhrzeit einstellen", "date-time"), action("Zeitzone \xE4ndern", "date-time"), action("Uhrzeit f\xFCr verschiedene Zeitzonen hinzuf\xFCgen", "date-time")] },
    { title: "Region und Sprache", items: [action("Tastaturen und Eingabemethoden \xE4ndern", "input-methods"), action("Anzeigesprache \xE4ndern", "display-language"), action("Datums-, Uhrzeit- oder Zahlenformat \xE4ndern", "regional-format")] }
  ] },
  access: { title: "Erleichterte Bedienung", icon: "/icons/control-panel/access.png", groups: [
    { title: "Center f\xFCr erleichterte Bedienung", items: [action("Einstellungen empfehlen lassen", "access-wizard"), action("Visuelle Darstellung des Bildschirms optimieren", "access-display"), action("Computer ohne Bildschirm verwenden", "narrator"), action("Computer ohne Maus oder Tastatur verwenden", "on-screen-keyboard"), action("Mausbedienung erleichtern", "mouse-keys"), action("Tastaturbedienung erleichtern", "keyboard-access"), action("Text oder visuelle Alternativen f\xFCr Sounds verwenden", "sound-access")] },
    { title: "Spracherkennung", items: [action("Spracherkennung starten", "speech-recognition"), action("Mikrofon einrichten", "microphone-setup")] }
  ] }
};
function getControlPanelCategory(categoryId) {
  return Object.prototype.hasOwnProperty.call(controlPanelCategories, categoryId) ? controlPanelCategories[categoryId] : null;
}

// category-source.mjs
function isAvailable(availableTargets, target) {
  return availableTargets instanceof Set ? availableTargets.has(target) : !!availableTargets && Object.prototype.hasOwnProperty.call(availableTargets, target) && availableTargets[target] === true;
}
function renderControlPanelCategory({ categoryId, onNavigate, availableTargets = {}, document: doc = globalThis.document }) {
  const root = doc.createElement("section");
  root.className = "cp-category-native";
  root.dataset.categoryId = categoryId || "";
  const category = getControlPanelCategory(categoryId);
  if (!category) {
    root.classList.add("cp-category-unknown");
    const title2 = doc.createElement("h2");
    title2.textContent = "Systemsteuerung";
    const message = doc.createElement("p");
    message.textContent = "Diese Kategorie ist nicht verf\xFCgbar.";
    root.append(title2, message);
    return root;
  }
  const header = doc.createElement("header");
  header.className = "cp-category-heading";
  const icon = doc.createElement("img");
  icon.src = category.icon;
  icon.alt = "";
  icon.width = 48;
  icon.height = 48;
  const title = doc.createElement("h2");
  title.textContent = category.title;
  header.append(icon, title);
  root.append(header);
  const groups = doc.createElement("div");
  groups.className = "cp-category-groups";
  for (const groupData of category.groups) {
    const group = doc.createElement("section");
    group.className = "cp-category-group";
    const heading = doc.createElement("h3");
    heading.textContent = groupData.title;
    group.append(heading);
    const list = doc.createElement("ul");
    for (const itemData of groupData.items) {
      const row = doc.createElement("li"), target = itemData.target, available2 = typeof onNavigate === "function" && isAvailable(availableTargets, target), item = doc.createElement(available2 ? "button" : "span");
      item.className = "cp-category-link";
      item.textContent = itemData.label;
      if (available2) {
        item.type = "button";
        item.addEventListener("click", () => onNavigate(target));
      } else {
        item.classList.add("is-unavailable");
        item.setAttribute("aria-disabled", "true");
        item.title = "Noch nicht in dieser Webumgebung verf\xFCgbar.";
      }
      row.append(item);
      list.append(row);
    }
    group.append(list);
    groups.append(group);
  }
  root.append(groups);
  return root;
}

// network-source.mjs
var controlPanelNetworkNavigation = Object.freeze([
  { target: "home", label: "Startseite der Systemsteuerung" },
  { target: "adapter-settings", label: "Adaptereinstellungen \xE4ndern" },
  { target: "advanced-sharing", label: "Erweiterte Freigabeeinstellungen \xE4ndern" },
  { target: "homegroup", label: "Heimnetzgruppe", related: true },
  { target: "internet-options", label: "Internetoptionen", related: true },
  { target: "firewall", label: "Windows-Firewall", related: true }
].map((item) => Object.freeze(item)));
var tasks = [
  ["setup-network", "Neue Verbindung oder neues Netzwerk einrichten", "Richtet eine Drahtlos-, Breitband-, Einw\xE4hl-, Ad-hoc- oder VPN-Verbindung bzw. einen Router oder Zugriffspunkt ein."],
  ["connect-network", "Verbindung mit einem Netzwerk herstellen", "Stellt (erneut) eine Verbindung mit einem Drahtlosnetzwerk, verkabelten Netzwerk, Einw\xE4hlnetzwerk oder VPN-Netzwerk her."],
  ["homegroup", "Heimnetzgruppen- und Freigabeoptionen ausw\xE4hlen", "Erm\xF6glicht Zugriff auf Dateien und Drucker auf anderen Netzwerkcomputern zu, oder \xE4ndert die Freigabeeinstellungen."],
  ["network-troubleshoot", "Probleme beheben", "Diagnostiziert und behebt Netzwerkprobleme, oder ruft Problembehandlungsinformationen ab."]
];
var owns = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key);
var available = (targets, key) => targets instanceof Set ? targets.has(key) : owns(targets, key) && targets[key] === true;
var finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
var bytes = (value) => finite(value) ? new Intl.NumberFormat("de-DE").format(value) + " Byte" : "Nicht verf\xFCgbar";
function getControlPanelNetworkData(snapshot, { now = Date.now(), shareEnabled } = {}) {
  const age = now - Date.parse(snapshot?.generatedAt);
  const fresh = snapshot?.scope === "host" && Number.isFinite(age) && age >= -5e3 && age <= 15e3;
  const adapters = fresh && Array.isArray(snapshot.interfaces) ? snapshot.interfaces.filter((item) => typeof item?.name === "string" && item.name.trim()).slice(0, 256).map((item) => ({
    name: item.name,
    received: finite(item.received) ? item.received : null,
    sent: finite(item.sent) ? item.sent : null,
    speed: finite(item.speed) && item.speed > 0 ? item.speed : null
  })) : [];
  return {
    hostAvailable: fresh,
    hostname: fresh && typeof snapshot.host?.hostname === "string" ? snapshot.host.hostname : null,
    generatedAt: fresh ? snapshot.generatedAt : null,
    adapters,
    shareEnabled: typeof shareEnabled === "boolean" ? shareEnabled : null
  };
}
function networkDataFromTaskManager(snapshot, { authenticated = false, role, shareEditing = false, readonly = false, now = Date.now() } = {}) {
  if (authenticated !== true || !["admin", "user"].includes(role) || shareEditing !== false || readonly !== false) return getControlPanelNetworkData(null, { now });
  return getControlPanelNetworkData(snapshot, { now });
}
var safeText = (value, max = 200) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
var validFamily = (value) => value === "IPv4" || value === "IPv6";
var isIPv4Address = (value) => typeof value === "string" && value.split(".").length === 4 && value.split(".").every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
var networkCapabilityKeys = ["readAdapters", "diagnose", "setDisplayName", "configureIpv4", "enable", "disable", "networkManagerCheckpoint"];
var normalizeCapabilities = (value) => Object.fromEntries(networkCapabilityKeys.map((key) => [key, value?.[key] === true]));
function normalizeNetworkAdapter(item, globalCapabilities) {
  const ifIndex = Number.isInteger(item?.ifindex) && item.ifindex >= 0 ? item.ifindex : null, name = safeText(item?.name, 160), mac = safeText(item?.mac, 80);
  if (ifIndex === null || !name) return null;
  const adapterId = safeText(item.id, 240) || String(ifIndex) + ":" + (mac ? mac.replaceAll(":", "") : "no-mac");
  const addresses = Array.isArray(item.addresses) ? item.addresses.slice(0, 64).flatMap((address) => {
    const family = address?.family === "inet" ? "IPv4" : address?.family === "inet6" ? "IPv6" : validFamily(address?.family) ? address.family : null, local = safeText(address?.local, 128), prefixLength = Number.isInteger(address?.prefixLength) && address.prefixLength >= 0 && address.prefixLength <= (family === "IPv4" ? 32 : 128) ? address.prefixLength : null;
    return family && local ? [{ family, local, prefixLength, scope: safeText(address?.scope, 40) }] : [];
  }) : null;
  const routes = Array.isArray(item.routes) ? item.routes.slice(0, 64).flatMap((route) => {
    const family = route?.family === "inet" ? "IPv4" : route?.family === "inet6" ? "IPv6" : validFamily(route?.family) ? route.family : null, gateway = safeText(route?.gateway, 128), destination = safeText(route?.destination, 160), metric = Number.isInteger(route?.metric) && route.metric >= 0 ? route.metric : null;
    return family ? [{ family, gateway, destination, metric }] : [];
  }) : null;
  const operState = ["up", "down", "dormant", "lowerlayerdown", "notpresent", "unknown"].includes(String(item.operState || "").toLowerCase()) ? String(item.operState).toLowerCase() : "unknown";
  const capabilities = { ...globalCapabilities, ...Object.fromEntries(networkCapabilityKeys.filter((key) => owns(item.capabilities, key)).map((key) => [key, item.capabilities[key] === true])) };
  return {
    adapterId,
    ifIndex,
    name,
    displayName: safeText(item.displayName, 160),
    mac,
    kind: safeText(item.kind, 80),
    mtu: Number.isInteger(item.mtu) && item.mtu > 0 && item.mtu <= 65535 ? item.mtu : null,
    adminUp: typeof item.adminUp === "boolean" ? item.adminUp : null,
    operState,
    addresses,
    routes,
    dnsServers: Array.isArray(item.dnsServers) ? item.dnsServers.slice(0, 32).map((value) => safeText(value, 128)).filter(Boolean) : null,
    dnsSource: safeText(item.dnsSource, 80),
    configurationReason: safeText(item.configurationReason, 240),
    capabilities
  };
}
function networkDataFromAdaptersSnapshot(snapshot, { authenticated = false, role, shareEditing = false, readonly = false, now = Date.now() } = {}) {
  const denied = { adapterListAvailable: false, generatedAt: null, hostname: null, revision: null, aliasRevision: null, adapters: [], capabilities: normalizeCapabilities(null) };
  if (authenticated !== true || role !== "admin" || shareEditing !== false || readonly !== false) return denied;
  const age = now - Date.parse(snapshot?.generatedAt), fresh = snapshot?.schemaVersion === 1 && snapshot?.scope === "host" && Number.isFinite(age) && age >= -5e3 && age <= 15e3;
  if (!fresh) return denied;
  const capabilities = normalizeCapabilities(snapshot.capabilities);
  const adapters = Array.isArray(snapshot.adapters) ? snapshot.adapters.slice(0, 128).map((item) => normalizeNetworkAdapter(item, capabilities)).filter(Boolean) : [];
  const adapter = snapshot.adapter ? normalizeNetworkAdapter(snapshot.adapter, capabilities) : null;
  return { adapterListAvailable: capabilities.readAdapters === true, generatedAt: snapshot.generatedAt, hostname: safeText(snapshot.hostname, 160), revision: typeof snapshot.revision === "string" && /^[a-f0-9]{64}$/.test(snapshot.revision) ? snapshot.revision : null, aliasRevision: Number.isInteger(snapshot.aliasRevision) && snapshot.aliasRevision >= 0 ? snapshot.aliasRevision : null, internetConnectivity: snapshot.internetConnectivity === "not-tested" ? "not-tested" : null, adapters, adapter, capabilities };
}
function targetAvailable(targets, key) {
  return available(targets, key);
}
function sectionElement(doc, tag, text2, className) {
  const node = doc.createElement(tag);
  if (text2 !== void 0) node.textContent = text2;
  if (className) node.className = className;
  return node;
}
function appendField(doc, parent, label, value) {
  parent.append(sectionElement(doc, "dt", label), sectionElement(doc, "dd", value ?? "Nicht verf\xFCgbar"));
}
function isSafeDiagnosticTarget(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 253 && /^[a-zA-Z0-9][a-zA-Z0-9.:%_-]*$/.test(value.trim());
}
function renderControlPanelNetwork({ document: doc = globalThis.document, data = {}, availableTargets = {}, onNavigate, onAction, busy = false, error = null, includeNavigation = true, now = Date.now() } = {}) {
  const el = (tag, text2, className) => sectionElement(doc, tag, text2, className);
  const root = el("section", void 0, "cp-network-page");
  root.setAttribute("aria-label", "Netzwerk- und Freigabecenter");
  root.setAttribute("aria-busy", String(!!busy));
  const diagnosticsReady = data?.capabilities?.diagnose === true && targetAvailable(availableTargets, "network-troubleshoot") && typeof onAction === "function";
  const link = (target, label, { internal = false, enabledOverride = false } = {}) => {
    let enabled = enabledOverride;
    if (!enabled) {
      if (internal === "adapter-settings") enabled = data?.capabilities?.readAdapters === true && typeof onNavigate === "function";
      else if (internal === "network-troubleshoot") enabled = diagnosticsReady;
      else enabled = typeof onNavigate === "function" && targetAvailable(availableTargets, target);
    }
    const node = el(enabled ? "button" : "span", label, "cp-network-link");
    node.dataset.networkTarget = target;
    if (enabled) {
      node.type = "button";
      node.addEventListener("click", () => {
        if (internal === "network-troubleshoot") {
          diagnostic.hidden = !diagnostic.hidden;
          diagnosticTarget?.focus?.();
          return;
        }
        if (typeof onNavigate === "function" && (internal === "adapter-settings" || targetAvailable(availableTargets, target))) onNavigate(target);
      });
    } else {
      node.classList.add("is-unavailable");
      node.setAttribute("aria-disabled", "true");
      node.title = targetReason(data, target);
    }
    return node;
  };
  if (includeNavigation) {
    const side = el("nav", void 0, "cp-network-sidebar");
    side.setAttribute("aria-label", "Systemsteuerung");
    for (const item of controlPanelNetworkNavigation.filter((item2) => !item2.related)) side.append(link(item.target, item.label, { internal: item.target === "adapter-settings" ? "adapter-settings" : false }));
    const related = el("div", void 0, "cp-network-related");
    related.append(el("p", "Siehe auch"));
    for (const item of controlPanelNetworkNavigation.filter((item2) => item2.related)) related.append(link(item.target, item.label));
    side.append(related);
    root.append(side);
  }
  const content = el("div", void 0, "cp-network-content");
  root.append(content);
  const home = el("div", void 0, "cp-network-home");
  content.append(home);
  home.append(el("h2", "Zeigen Sie die grundlegenden Informationen zum Netzwerk an, und richten Sie Verbindungen ein."));
  const map = el("div", void 0, "cp-network-map");
  map.append(el("p", "Die Netzwerk\xFCbersicht des Webdesktops ist nicht mit einer Windows-Netzwerk\xFCbersicht gleichzusetzen."), link("network-map", "Gesamt\xFCbersicht anzeigen"));
  home.append(map);
  const heading = (text2, target, label, internal) => {
    const row = el("div", void 0, "cp-network-section-heading");
    row.append(el("h3", text2));
    if (target) row.append(link(target, label, { internal }));
    home.append(row);
  };
  heading("Aktive Netzwerke anzeigen", "connect-network", "Verbindung herstellen oder trennen");
  const active = el("div", void 0, "cp-network-active");
  active.append(el("p", "F\xFCr diesen Webdesktop liegen keine Informationen \xFCber aktive Windows-Netzwerke oder Internetzugriff vor."));
  const status = el("dl");
  for (const [label, value] of [["Zugriffstyp:", "Nicht ermittelt"], ["Verbindungen:", "Nicht ermittelt"]]) status.append(el("dt", label), el("dd", value));
  active.append(status);
  home.append(active);
  heading("Netzwerkeinstellungen \xE4ndern");
  const list = el("ul", void 0, "cp-network-tasks");
  for (const [target, label, description] of tasks) {
    const row = el("li");
    row.append(link(target, label, { internal: target === "network-troubleshoot" ? "network-troubleshoot" : false }), el("p", description));
    list.append(row);
  }
  home.append(list);
  const diagnostic = el("section", void 0, "cp-network-diagnostic");
  diagnostic.hidden = true;
  diagnostic.setAttribute("aria-label", "Netzwerkdiagnose");
  diagnostic.append(el("h3", "Netzwerkdiagnose"), el("p", "Die Diagnose l\xE4uft auf dem Serverhost. Sie pr\xFCft keine Verbindung aus Windows und \xE4ndert keine Adaptereinstellungen."));
  const diagnosticForm = el("form", void 0, "cp-network-diagnostic-form"), diagnosticKind = el("select"), diagnosticTarget = el("input"), diagnosticSubmit = el("button", "Diagnose starten");
  for (const [value, label] of [["ping", "Ping"], ["dns", "DNS-Aufl\xF6sung"]]) {
    const option = el("option", label);
    option.value = value;
    diagnosticKind.append(option);
  }
  diagnosticKind.value = "ping";
  diagnosticTarget.type = "text";
  diagnosticTarget.maxLength = 253;
  diagnosticTarget.autocomplete = "off";
  diagnosticTarget.setAttribute("aria-label", "Hostname oder IP-Adresse");
  diagnosticTarget.placeholder = "Hostname oder IP-Adresse";
  diagnosticSubmit.type = "submit";
  diagnosticSubmit.disabled = !!busy;
  diagnosticForm.append(diagnosticKind, diagnosticTarget, diagnosticSubmit);
  diagnosticForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = diagnosticTarget.value.trim();
    if (!isSafeDiagnosticTarget(target)) {
      diagnosticTarget.setCustomValidity?.("Bitte einen g\xFCltigen Hostnamen oder eine IP-Adresse eingeben.");
      diagnosticTarget.reportValidity?.();
      return;
    }
    diagnosticTarget.setCustomValidity?.("");
    onAction?.({ action: "diagnose", kind: diagnosticKind.value, target });
  });
  const result = data?.diagnostic;
  if (result && typeof result.output === "string") {
    const resultBox = el("section", void 0, "cp-network-diagnostic-result");
    resultBox.setAttribute("aria-label", "Diagnoseergebnis");
    resultBox.append(el("h4", "Ergebnis: " + (result.kind === "dns" ? "DNS-Aufl\xF6sung" : "Ping")), el("p", "Hostdiagnose \xB7 " + (Number.isInteger(result.exitCode) ? "Exitcode " + result.exitCode : "Exitcode nicht verf\xFCgbar")));
    const output = el("pre", result.output);
    resultBox.append(output);
    if (result.internetConnectivity === "not-tested") resultBox.append(el("p", "Ein fehlgeschlagener Ping belegt keinen getrennten Internetzugriff."));
    diagnostic.append(resultBox);
  }
  diagnostic.append(diagnosticForm);
  if (error) diagnostic.append(el("p", String(error), "cp-network-error"));
  home.append(diagnostic);
  const model = getControlPanelNetworkData({ scope: data?.hostAvailable === true ? "host" : null, generatedAt: data?.generatedAt, host: { hostname: data?.hostname }, interfaces: data?.adapters }, { now, shareEnabled: data?.shareEnabled });
  const observation = el("details", void 0, "cp-network-observations");
  observation.append(el("summary", "Verf\xFCgbare Informationen des Webdesktops"));
  observation.append(el("p", "Host-Adapter und \xF6ffentlicher Desktop sind getrennte Webdesktopdaten und belegen weder Windows-Netzwerkverbindungen noch eine Heimnetzgruppe."));
  if (model.hostAvailable) {
    observation.append(el("p", "Datenquelle: Host-Monitor" + (model.hostname ? " \xB7 " + model.hostname : "") + " \xB7 " + new Date(model.generatedAt).toLocaleString("de-DE")));
    if (model.adapters.length) {
      const wrap = el("div", void 0, "cp-network-table-wrap"), table = el("table"), head = el("thead"), tr = el("tr");
      for (const title of ["Host-Adapter", "Empfangen (gesamt)", "Gesendet (gesamt)", "Linkgeschwindigkeit"]) {
        const th = el("th", title);
        th.scope = "col";
        tr.append(th);
      }
      head.append(tr);
      table.append(head);
      const body = el("tbody");
      for (const adapter of model.adapters) {
        const row = el("tr");
        const th = el("th", adapter.name);
        th.scope = "row";
        row.append(th, el("td", bytes(adapter.received)), el("td", bytes(adapter.sent)), el("td", adapter.speed === null ? "Nicht verf\xFCgbar" : new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(adapter.speed / 1e6) + " MBit/s"));
        body.append(row);
      }
      table.append(body);
      wrap.append(table);
      observation.append(wrap);
    } else observation.append(el("p", "Der Host-Monitor meldet keine Adapter. Dies belegt keinen getrennten Netzwerkzustand."));
  } else observation.append(el("p", "Aktuelle Host-Adapterdaten sind nicht verf\xFCgbar."));
  observation.append(el("p", "\xD6ffentlicher Desktop: " + (model.shareEnabled === null ? "Nicht ermittelt" : model.shareEnabled ? "Freigabe aktiviert" : "Freigabe deaktiviert")));
  const actions = el("div", void 0, "cp-network-web-actions");
  actions.append(link("share", "\xD6ffentlichen Desktop verwalten"), link("explorer-network", "Netzwerk im Explorer \xF6ffnen"), link("task-manager", "Hostinformationen im Task-Manager anzeigen"));
  observation.append(actions);
  home.append(observation);
  home.append(el("p", "Grau dargestellte Aufgaben sind in dieser Webumgebung noch nicht verf\xFCgbar.", "cp-network-limit"));
  return root;
}
function renderControlPanelAdapters({ document: doc = globalThis.document, data = {}, availableTargets = {}, onNavigate, busy = false, error = null } = {}) {
  const el = (tag, text2, className) => sectionElement(doc, tag, text2, className), root = el("section", void 0, "cp-network-adapters");
  root.setAttribute("aria-label", "Netzwerkverbindungen");
  root.setAttribute("aria-busy", String(!!busy));
  const toolbar = el("div", void 0, "cp-network-adapter-toolbar"), organize = el("button", "Organisieren"), disable = el("button", "Netzwerkger\xE4t deaktivieren"), inspect = el("button", "Verbindung untersuchen"), rename = el("button", "Verbindung umbenennen");
  for (const button of [organize, disable, inspect, rename]) button.type = "button";
  organize.disabled = true;
  organize.title = "Keine weiteren Organisationsoptionen verf\xFCgbar.";
  disable.disabled = true;
  disable.title = "\xC4nderungen am Hostadapter sind nicht freigegeben.";
  inspect.disabled = true;
  rename.disabled = true;
  toolbar.append(organize, disable, inspect, rename);
  root.append(toolbar);
  if (!data?.adapterListAvailable) {
    root.append(el("p", data?.error || "Aktuelle Host-Adapterdaten sind nicht verf\xFCgbar.", "cp-network-unavailable"));
    if (error) root.append(el("p", String(error), "cp-network-error"));
    return root;
  }
  const list = el("div", void 0, "cp-network-adapter-list");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Hostadapter");
  let selected = null;
  const rows = [];
  const openStatus = (adapter) => {
    if (adapter && data?.capabilities?.readAdapters === true && targetAvailable(availableTargets, "adapter-details")) onNavigate?.("adapter-details", { adapterId: adapter.adapterId });
  };
  const openAddressDetails = (adapter) => {
    if (adapter && data?.capabilities?.readAdapters === true && targetAvailable(availableTargets, "adapter-address-details")) onNavigate?.("adapter-address-details", { adapterId: adapter.adapterId });
  };
  const select = (adapter) => {
    selected = adapter;
    for (const row of rows) {
      const active = row.dataset.adapterId === adapter.adapterId;
      row.setAttribute("aria-selected", String(active));
      row.classList.toggle("selected", active);
    }
    inspect.disabled = !(data?.capabilities?.readAdapters === true && targetAvailable(availableTargets, "adapter-details"));
    rename.disabled = !(data?.capabilities?.setDisplayName === true && targetAvailable(availableTargets, "adapter-address-details"));
  };
  for (const adapter of data.adapters || []) {
    const tile = el("button", void 0, "cp-network-adapter-tile");
    tile.type = "button";
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", "false");
    tile.dataset.adapterId = adapter.adapterId;
    tile.title = "Hostschnittstelle \xB7 Index " + adapter.ifIndex + (adapter.mac ? " \xB7 " + adapter.mac : "");
    const icon = el("span", void 0, "cp-network-adapter-icon");
    icon.setAttribute("aria-hidden", "true");
    const symbol = el("img");
    symbol.src = "/icons/network-16.png";
    symbol.alt = "";
    icon.append(symbol);
    const text2 = el("span", void 0, "cp-network-adapter-text"), type = adapter.kind === "ether" ? "Ethernet" : adapter.kind === "wlan" ? "WLAN" : adapter.kind || "Adaptertyp nicht verf\xFCgbar";
    text2.append(el("span", adapter.displayName || adapter.name), el("span", "Hostadapter"), el("span", type + " \xB7 " + adapter.name));
    tile.append(icon, text2);
    tile.addEventListener("click", () => select(adapter));
    tile.addEventListener("dblclick", () => openStatus(adapter));
    rows.push(tile);
    list.append(tile);
  }
  if (!rows.length) list.append(el("p", "Der Host-Agent hat keine Adapter gemeldet."));
  inspect.addEventListener("click", () => openStatus(selected));
  rename.addEventListener("click", () => openAddressDetails(selected));
  root.append(list);
  if (error) root.append(el("p", String(error), "cp-network-error"));
  return root;
}
function renderControlPanelAdapterStatus({ document: doc = globalThis.document, data = {}, availableTargets = {}, onAction, onNavigate, busy = false, error = null } = {}) {
  const el = (tag, text2, className) => sectionElement(doc, tag, text2, className), root = el("section", void 0, "cp-network-adapter-status");
  root.setAttribute("aria-label", "Adapterstatus");
  root.setAttribute("aria-busy", String(!!busy));
  const adapter = data?.adapter;
  if (!adapter || typeof adapter.adapterId !== "string") {
    root.append(el("p", "Adapterstatus ist nicht verf\xFCgbar.", "cp-network-unavailable"));
    if (error) root.append(el("p", String(error), "cp-network-error"));
    return root;
  }
  const tab = el("div", void 0, "cp-network-status-tabs");
  tab.setAttribute("role", "tablist");
  const tabButton = el("button", "Allgemein", "cp-network-status-tab");
  tabButton.type = "button";
  tabButton.setAttribute("role", "tab");
  tabButton.setAttribute("aria-selected", "true");
  tab.append(tabButton);
  const panel = el("div", void 0, "cp-network-status-panel");
  panel.setAttribute("role", "tabpanel");
  const connection = el("fieldset", void 0, "cp-network-status-group");
  connection.append(el("legend", "Verbindung"));
  const mediaStatus = adapter.adminUp === false ? "Deaktiviert" : adapter.operState === "up" ? "Aktiviert" : adapter.operState === "down" ? "Getrennt" : null;
  const values = el("dl", void 0, "cp-network-status-values");
  appendField(doc, values, "IPv4-Konnektivit\xE4t:", null);
  appendField(doc, values, "IPv6-Konnektivit\xE4t:", null);
  appendField(doc, values, "Medienstatus:", mediaStatus);
  appendField(doc, values, "Dauer:", null);
  appendField(doc, values, "\xDCbertragungsrate:", null);
  connection.append(values);
  const details = el("button", "Details \u2026", "cp-network-details-button");
  details.type = "button";
  details.disabled = !(data?.capabilities?.readAdapters === true && targetAvailable(availableTargets, "adapter-address-details") && typeof onNavigate === "function");
  details.addEventListener("click", () => {
    if (!details.disabled) onNavigate("adapter-address-details", { adapterId: adapter.adapterId });
  });
  connection.append(details);
  const activity = el("fieldset", void 0, "cp-network-status-group cp-network-activity");
  activity.append(el("legend", "Aktivit\xE4t"));
  const directions = el("div", void 0, "cp-network-activity-directions"), sent = el("span", "Gesendet"), icon = el("span", void 0, "cp-network-activity-icon"), image = el("img"), received = el("span", "Empfangen");
  icon.setAttribute("aria-hidden", "true");
  image.src = "/icons/network-16.png";
  image.alt = "";
  icon.append(image);
  directions.append(sent, icon, received);
  const counters = el("div", void 0, "cp-network-activity-counters");
  counters.append(el("span", "Bytes: " + bytes(adapter.sent)), el("span", ""), el("span", "Bytes: " + bytes(adapter.received)));
  activity.append(directions, counters);
  panel.append(connection, activity);
  root.append(tab, panel);
  const actions = el("div", void 0, "cp-network-status-actions"), properties = el("button", "Eigenschaften"), disable = el("button", "Deaktivieren"), diagnose = el("button", "Diagnose");
  properties.type = disable.type = diagnose.type = "button";
  properties.disabled = true;
  properties.title = adapter.configurationReason || "Adapter\xE4nderungen sind in dieser Version nicht freigegeben.";
  disable.disabled = adapter.capabilities?.disable !== true;
  disable.title = adapter.configurationReason || "Adapter\xE4nderungen sind in dieser Version nicht freigegeben.";
  diagnose.disabled = !((adapter.capabilities?.diagnose === true || data?.capabilities?.diagnose === true) && targetAvailable(availableTargets, "network-troubleshoot") && typeof onAction === "function") || !!busy;
  actions.append(properties, disable, diagnose);
  root.append(actions);
  const diagnostic = el("section", void 0, "cp-network-status-diagnostic");
  diagnostic.hidden = true;
  const form = el("form", void 0, "cp-network-diagnostic-form"), kind = el("select"), target = el("input"), run = el("button", "Diagnose starten");
  for (const [value, label] of [["ping", "Ping"], ["dns", "DNS-Aufl\xF6sung"]]) {
    const option = el("option", label);
    option.value = value;
    kind.append(option);
  }
  kind.value = "ping";
  target.type = "text";
  target.maxLength = 253;
  target.autocomplete = "off";
  target.placeholder = "Hostname oder IP-Adresse";
  target.setAttribute("aria-label", "Hostname oder IP-Adresse");
  run.type = "submit";
  run.disabled = !!busy;
  form.append(kind, target, run);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = target.value.trim();
    if (!isSafeDiagnosticTarget(value)) {
      target.setCustomValidity?.("Bitte einen g\xFCltigen Hostnamen oder eine IP-Adresse eingeben.");
      target.reportValidity?.();
      return;
    }
    target.setCustomValidity?.("");
    onAction?.({ action: "diagnose", kind: kind.value, target: value });
  });
  diagnostic.append(form);
  diagnose.addEventListener("click", () => {
    if (!diagnose.disabled) {
      diagnostic.hidden = !diagnostic.hidden;
      if (!diagnostic.hidden) target.focus?.();
    }
  });
  root.append(diagnostic);
  if (data?.diagnostic && typeof data.diagnostic.output === "string") {
    const result = el("section", void 0, "cp-network-diagnostic-result");
    result.setAttribute("aria-label", "Diagnoseergebnis");
    result.append(el("h3", "Hostdiagnose"), el("p", "Exitcode: " + (Number.isInteger(data.diagnostic.exitCode) ? data.diagnostic.exitCode : "Nicht verf\xFCgbar")), el("pre", data.diagnostic.output));
    if (data.diagnostic.internetConnectivity === "not-tested") result.append(el("p", "Dies belegt keinen getrennten Internetzugriff."));
    root.append(result);
  }
  if (error) root.append(el("p", String(error), "cp-network-error"));
  return root;
}
function renderControlPanelAdapterDetails({ document: doc = globalThis.document, data = {}, onAction, busy = false, error = null } = {}) {
  const el = (tag, text2, className) => sectionElement(doc, tag, text2, className), root = el("section", void 0, "cp-network-adapter-details");
  root.setAttribute("aria-label", "Netzwerkverbindungsdetails");
  root.setAttribute("aria-busy", String(!!busy));
  const adapter = data?.adapter;
  if (!adapter || typeof adapter.adapterId !== "string") {
    root.append(el("p", "Adapterdetails sind nicht verf\xFCgbar.", "cp-network-unavailable"));
    if (error) root.append(el("p", String(error), "cp-network-error"));
    return root;
  }
  root.append(el("p", "Netzwerkverbindungsdetails:"));
  const rows = [], addresses = Array.isArray(adapter.addresses) ? adapter.addresses : [], routes = Array.isArray(adapter.routes) ? adapter.routes : [];
  const list = (family) => addresses.filter((item) => item.family === family), v4 = list("IPv4"), v6 = list("IPv6");
  const dottedMask = (prefix) => {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
    const bits = prefix === 0 ? 0 : 4294967295 << 32 - prefix >>> 0;
    return [24, 16, 8, 0].map((shift) => bits >>> shift & 255).join(".");
  };
  const routeDefaults = (family, values) => routes.filter((item) => item.family === family && ["default", family === "IPv4" ? "0.0.0.0/0" : "::/0"].includes(item.destination || "")).map((item) => item.gateway).filter(Boolean).join(", ") || null;
  const add = (name, value) => rows.push([name, value ?? "Nicht verf\xFCgbar"]);
  add("Verbindungsspezifisches DNS-Suffix", null);
  add("Beschreibung", "Hostadapter \xB7 " + adapter.name);
  add("Physische Adresse", adapter.mac);
  add("DHCP aktiviert", null);
  const dns = Array.isArray(adapter.dnsServers) ? adapter.dnsServers : null, byFamily = (family) => {
    if (!dns) return null;
    const matched = dns.filter((value) => family === "IPv4" ? isIPv4Address(value) : value.includes(":"));
    return matched.join(", ") || (dns.length ? "Keine gemeldeten Server dieser Familie" : "Keine gemeldet");
  }, unknownDns = dns?.filter((value) => !isIPv4Address(value) && !value.includes(":"));
  add("IPv4-Adresse", v4.map((item) => item.local).join(", ") || null);
  add("IPv4-Subnetzmaske", v4.map((item) => dottedMask(item.prefixLength)).filter(Boolean).join(", ") || null);
  add("Lease erhalten am", null);
  add("Lease l\xE4uft ab am", null);
  add("IPv4-Standardgateway", routeDefaults("IPv4", routes));
  add("IPv4-DHCP-Server", null);
  add("IPv4-DNS-Server", byFamily("IPv4"));
  add("IPv4-WINS-Server", null);
  add("NetBIOS \xFCber TCP/IP aktiviert", null);
  add("IPv6-Adresse", v6.filter((item) => item.scope !== "link").map((item) => item.local + (Number.isInteger(item.prefixLength) ? "/" + item.prefixLength : "")).join(", ") || null);
  add("Tempor\xE4re IPv6-Adresse", null);
  add("IPv6-Link-Local-Adresse", v6.filter((item) => item.scope === "link").map((item) => item.local + (Number.isInteger(item.prefixLength) ? "/" + item.prefixLength : "")).join(", ") || null);
  add("IPv6-Standardgateway", routeDefaults("IPv6", routes));
  add("IPv6-DNS-Server", byFamily("IPv6"));
  if (unknownDns?.length) add("DNS-Server (Familie nicht ermittelt)", unknownDns.join(", "));
  const table = el("table", void 0, "cp-network-details-table"), head = el("thead"), headRow = el("tr");
  for (const title of ["Eigenschaft", "Wert"]) {
    const th = el("th", title);
    th.scope = "col";
    headRow.append(th);
  }
  head.append(headRow);
  table.append(head);
  const body = el("tbody");
  for (const [name, value] of rows) {
    const row = el("tr");
    row.append(el("th", name), el("td", value));
    row.children[0].scope = "row";
    body.append(row);
  }
  table.append(body);
  root.append(table);
  if ((adapter.capabilities?.setDisplayName === true || data?.capabilities?.setDisplayName === true) && typeof onAction === "function") {
    const alias = el("details", void 0, "cp-network-alias"), summary = el("summary", "Web-Anzeigename \xE4ndern \u2026"), form = el("form", void 0, "cp-network-label-form"), label = el("label", "Anzeigename"), input = el("input"), save = el("button", "Speichern");
    input.type = "text";
    input.maxLength = 80;
    input.value = adapter.displayName === adapter.name ? "" : adapter.displayName || "";
    input.placeholder = "Leer lassen, um den Alias zu entfernen";
    input.autocomplete = "off";
    label.append(input);
    save.type = "submit";
    save.disabled = !!busy;
    form.append(label, save);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const displayName = input.value.trim();
      if (displayName.length > 80 || /[\r\n\u0000-\u001f]/.test(displayName)) {
        input.setCustomValidity?.("Bitte h\xF6chstens 80 druckbare Zeichen eingeben.");
        input.reportValidity?.();
        return;
      }
      input.setCustomValidity?.("");
      onAction({ action: "label", adapterId: adapter.adapterId, displayName, expectedRevision: data.aliasRevision });
    });
    alias.append(summary, form);
    root.append(alias);
  }
  if (error) root.append(el("p", String(error), "cp-network-error"));
  return root;
}
function targetReason(data, target) {
  return target === "adapter-settings" && !data?.capabilities?.readAdapters ? "Adapterinformationen sind nicht freigegeben." : "Diese Funktion wird vom aktuellen Hostvertrag nicht freigegeben.";
}

// network-host.mjs
import { taskbarWorkArea } from "/taskbar-state.js";

// network-icons.mjs
var lanConnected = "data:image/png;base64,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QKFQwPT0dEiPlpYWpFIpeU3usnmmadJEIiE0TRNCCLdarU7Nzs4+yDl/7uabb5ZBOy+0SaEFbUF+pAfq9XofIeR213VPKK1pGiKRCAzDCO+R3pCUkNyPx+Po6OgIuV0ul1GtVrFo0SJl+/btrwwODmZc16W+77u1Wi3red5+APvuvvvu/57zT3mI+a0AMpkM6+/vh67roful8vL4ZACSEjIeJACpuLxHApJgpWfkc/v27XvtgQceeLEZkJWTOH7Kuw5Svv9qZk1v3LhGM9Qz5mreUNljvUzghX/6fO+lHwnghhtuGL///vv/emho6GfzlJEUkgoKIatzg9fynAzO+cwiqSPPyd+dO3fuO3z48G4AbnPVTlL+BMev+vsf3r9p47rPe5479Yt/e27zi09tO9ELXf/v798uONscAU5XKEw53TlMsOk6e6HssW3/axBfd911D2zbti22atWqH3R0dHRIC0swYRcp91oau3kngrpWq4XHcnd5x44dV9xzzz2vSM4DaJHbPwCqzd8THP/iFTf9Yust37xqZU8KR0cnB598dtebt9zzzD8s2filq8cmc9es7mrBF/qTGLNcPDlSxhuzFiZdjFs+3k7p9PVTqgN33XVXb39//1+l0+nNhmEMGYYRU1VVkRRqZiVer9edbDabyWazd3ue9+qWLVveOukVzf2KDzl+w/fuOj9uaD/58z/7k/XReCeefnYXvNoUzh3qwysfZOG3deKM9ii6F3fhmWkXj47WUI22IqEIGMXpquLVtvF6devsD65yTqmQPfTQQ0o6ne73PG+t67oDpmlGKaW0WCyKqakp17IsGaj7I5HIsdtuu+0jh/LLr/1eIrUo/UfFQrH38su+8KOvXvZFzFY9vLxjF+ZqDr519SbEIyqyLse7w8cxmy3j17tfhZWbhdqaxPMzc3OFkXcfY6MHHwEh73hTx6uf+B8cC5Xv/ON9X6eE3bZuefrsY9MlnHP26bA5RW5qHMfnahi6ZB1UIwo9kLOBAcMLkBk5ikKpjP6ePpTnpvDkE8/c8cwvf/r95iuNJhW931qJP6k8tuOtpalY5JZ33zuywasU19509WaY7WkEtovDo1lMzhUwXqzDETMQ+56A1roa6uIB7D90ANmpcXT39qGvtxfdfcswMT3JXVW344nUaVY1LxWXgR6Onp86gFu2/kRLRLWb68XZO47szSiMMCxZ1o87HtwBM96Kxb3t6OuNYDpbQBsr4Nr1Z0K0rsC7k3kc2rsbfSuW48zTB6Hp0TBNO7YNz3WpIAoDEZlmLJ0oeJ86gGjE2J/uaj+rYHnoWjEAM8IRMXT88cASzOQr2L7zTRT6etBtAJdddDHGeBT79x1ET2cSG7+8CW4gN5PkZkIAShXEY/EwNSuKoluVgsxivyGfOoDBwYFVn1t7DvbueQ3rz1+Cot0O4vp45/0PMJWdxrJFXTj7tB4czUzjsT2HcfqyRfjyxReGc3K9XoMZkQMSgckFrLqNva+9jNd//dILnhs89VHf+9QB2E7gHhubVhP+G9CYhV/tBL5yTgJHjx9Ha8syKILJ+VeMT86QzZv+EOnORciXJJ05+pb24sjIGA4eGkZLSxR7dj3/2sGD7915YPeTj3/c9z51ALoeiQ2eNoTdE164U5FmO1Eud6InZSMlysiKQfT19pC5oo3l/T2YnplDsjUBx/Hxrz9/GNsfe/jOsfHjo8ypFhb3Dz4+fGCnLIb4zADseOHp1S89/9T5b+598bzDm/1rF3e300pVxUBvD0aOvIwjMxF8bv1q+d8oV3DE21pb8cgT2/Hyf/7qxfGxkRuOHHj52Py7KoXp3/q933kd6Fu67KIzVp919bdv3HTZ3v17ehPpy/EXX/0Knn15H3qXLMK2n95/aHJ05FsHXnlC9k3/v+WmG/90053/cu/P33jrUO6yv/zu8dUXff3b/9d3fiaV+GT54T/fHZ2cmv7mG28fG9334iPPfNbf/738XvCb8l80xA7bNpd8iAAAAABJRU5ErkJggg==";
var lanNeutral = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAEjElEQVR4nO3WbUwTdxwH8O/1udhSpIHy0LOgkzJQ7KZMp5k6Fx0ZbMPFLWPDhGQxPiXLloVk0SwbyYLbi5nFhcXswWRGzBZkKBNHGMiDCvIYlQcRLC2tfYLSUvp4197d0kRfbNnDiyHO5D7JvbrL7/v/Xv7/3AE8Ho/H4/F4PB6Px+PxeDwej8d77BB4DBy9Nv00qZDuFUtF+e4gneujGZLh0PL5ZvJF0aNeXNm7x04Vb9+wmaYp+9kffy1pPV8TenDvnV/ufMyxTIkMyBMKkMAyHCIMxzhCTIuPZmrizzzSAjteO3i2qnJf2RNaNSbNNn1DU+dA5TeN72Vuf6HcYpvZa0hNxJasJFgCFBqMPvTOBmCjYA1EcVMtEVx/ZFto/5EvNymk4hNvvvFqoVyRggtNnaCDdjyVq8OVuy5El6cgP1mO9IxUNDoo/GQOwi9XQSnkIPU6/EI6WMOG/FWzn5RFlqxAacURpTpN87LX4yVLi7Z8trtoB2b9NNrbOuEORnCovBgKmQguisXIuAmzLh+udl1DYGYWIlUSmp1ut8c4UseYh2tBELdou8kfn7skBT749Ls9AoL5aMNKTcGUYx7rCvIQZgWYsVthcgeR+/wGiKRySGIEkiRSSOkYpo2T8Mz7kKXVwee2o6G+sbrx55NH74+UAuAA0A/tDNS13VihXiarHLk98Sy94F1/sLwECckaxMIUxswu2NweWL0hRDgnuP56iFUGiDJyMDg6BJfdinRSBx1JIl2XjXsOG0uJJGGFUr064J+LLzx+0L3xnEUvUFl1QqyUi98PeWerJ/qmhQzBIDM7C9U/tCFBoUIGmQwdKYPD5cFyxoOKwjXgVKswYpvDaF8XdKtWYk2eHmKJHLFYDJFwGDRFCThCyIDgpgGw998+91AKyGXSQU1q8lpPgEbqqhwkyFjIpBK8kpMJ59wCLnYMwKPTIl0KFG3dBgsrx2D/MLQpSdi+sxhULAqwHKhoDAKBEIplCgiFwvglCSx46D/nLXoBvT7nyY3r16GvuweFmzLhDSeDoKK4decu7C4HstNSUbBai8lpB+q6x5CXnYad255DlBEgFAoiQSYDQRBIYDkEQmH09bTj+tXLLTQVO/9XeYteIByJUVMWh0gZ7YWYCeBSB7BrnRKTJhNUidkQcgyCEYqz2pxESfFL0KSkYW4+vp1Z6FaQmDBaMDw6jsREObo7m3uGh28fH+pqOPd3eYteQCKRLdOvzkXXPRpCgoOG6YDPlwKtOgw154OL00NHagm3N4yVWVo4nG4kqZSIRKL4/vQZXKw7c9xiNZmZiN+TkaU/Nz7UQf1T3qIXaGu5YLjcfH7TQF/rM2Ml0YqM9GTBgl+EHFIL40Q7JpwybCw0RKMcKI6FYrlKhdr6i2j/7VKr1WLcPzHUPvVg1oLH8a95D/07oFuRvTXfsLb88IHior7BblKpKcVbu3ehqb0fZGYaak6eGrWZjYeGrtR34f/u4IHXi49/9e3p3hujM0Vvf2gybN1z+L/OXPJ/oWNffC232R37em9OmftbaxuXOp/Hwx/9Du349ArTnZEiAAAAAElFTkSuQmCC";

// network-host.mjs
function createNetworkPanelHost({ desktop, getState, getContextKey, navigate, request = fetch, document: doc = document }) {
  const el = (tag, text2, cls) => {
    const node = doc.createElement(tag);
    if (text2 !== void 0) node.textContent = text2;
    if (cls) node.className = cls;
    return node;
  };
  let context = getContextKey(), status = null, details = null, sequence = 0, listRefresh = null;
  const personalAdmin = () => {
    const state = getState();
    return state.authenticated === true && state.role === "admin" && !state.readonly && !state.shareEditing;
  };
  const current = (key) => key === getContextKey() && personalAdmin();
  function applyAdapterIcons(root, data) {
    for (const tile of root.querySelectorAll(".cp-network-adapter-tile")) {
      const adapter = data.adapters?.find((item) => item.adapterId === tile.dataset.adapterId);
      if (!adapter) continue;
      const linked = adapter.adminUp === true && adapter.operState === "up", ethernet = ["ether", "ethernet", "veth"].includes(adapter.kind);
      const image = tile.querySelector(".cp-network-adapter-icon img");
      if (image) {
        image.src = linked && ethernet ? lanConnected : lanNeutral;
        image.width = image.height = 48;
        image.dataset.connectionIcon = linked && ethernet ? "local-link" : "neutral";
      }
      const label = tile.querySelector(".cp-network-adapter-text>span:nth-child(2)");
      if (label) label.textContent = adapter.adminUp === false ? "Deaktiviert" : linked ? "Verbunden (lokaler Link)" : ["down", "lowerlayerdown", "notpresent"].includes(adapter.operState) ? "Nicht verbunden" : "Status unbekannt";
    }
  }
  async function api(path, { signal, value } = {}) {
    const response = await request(path, { signal, cache: "no-store", ...value ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) } : {} });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Netzwerkdaten sind nicht verf\xFCgbar.");
    return data;
  }
  const targets = (data) => /* @__PURE__ */ new Set(["home", "network-center", ...data?.capabilities?.readAdapters ? ["adapter-settings", "adapter-details", "adapter-address-details"] : [], ...data?.capabilities?.diagnose ? ["network-troubleshoot"] : [], ...data?.capabilities?.setDisplayName ? ["adapter-label"] : []]);
  function refreshContext() {
    const next = getContextKey();
    if (next === context) return false;
    context = next;
    closeStatus();
    return true;
  }
  function closeDetails() {
    if (!details) return;
    const prior = details;
    details = null;
    if (prior.dialog.open) prior.dialog.close();
    else prior.dialog.remove();
  }
  function closeStatus() {
    closeDetails();
    if (!status) return;
    const prior = status;
    status = null;
    prior.controller.abort();
    prior.actionController?.abort();
    if (prior.dialog.open) prior.dialog.close();
    else prior.dialog.remove();
  }
  function statusCurrent(record) {
    return status === record && record.dialog.open && current(record.context);
  }
  function drawStatus(record) {
    if (!statusCurrent(record)) return;
    const data = { ...networkDataFromAdaptersSnapshot(record.snapshot, getState()), ...record.diagnostic ? { diagnostic: record.diagnostic } : {} };
    const restoreDetailsFocus = record.body.querySelector(".cp-network-details-button") === doc.activeElement;
    const diagnosticsOpen = record.body.querySelector(".cp-network-status-diagnostic")?.hidden === false;
    record.body.replaceChildren(renderControlPanelAdapterStatus({ document: doc, data, availableTargets: targets(data), busy: record.busy, error: record.error, onAction: (value) => perform(record, value), onNavigate: (target, options = {}) => {
      if (target === "adapter-address-details" && options.adapterId === record.adapterId && targets(data).has(target)) openDetails(record);
    } }));
    if (diagnosticsOpen || record.diagnostic || record.error) {
      const section = record.body.querySelector(".cp-network-status-diagnostic");
      if (section) section.hidden = false;
    }
    if (data.adapter) record.title.textContent = "Status von " + (data.adapter.displayName || data.adapter.name);
    drawDetails(record);
    if (restoreDetailsFocus && !details) record.body.querySelector(".cp-network-details-button")?.focus({ preventScroll: true });
  }
  function showWindow(dialog, width, height) {
    const state = getState(), prefs = state.readonly ? state.publicDesktop : state.desktop, area = taskbarWorkArea({ width: innerWidth, height: innerHeight }, prefs?.taskbar), vw = Math.max(1, area.width), vh = Math.max(1, area.height);
    dialog.showModal();
    desktop.show(dialog.id);
    desktop.applyWorkspaceGeometry(dialog.id, { mode: "normal", left: Math.max(0, (vw - width) / 2) / vw, top: Math.max(0, (vh - height) / 2) / vh, width: Math.min(width, vw) / vw, height: Math.min(height, vh) / vh });
  }
  function drawDetails(parent) {
    if (!details || details.parent !== parent || !details.dialog.open || !statusCurrent(parent)) return;
    const data = networkDataFromAdaptersSnapshot(parent.snapshot, getState());
    details.body.replaceChildren(renderControlPanelAdapterDetails({ document: doc, data, busy: parent.busy, error: parent.error, onAction: (value) => perform(parent, value) }));
  }
  function openDetails(parent) {
    if (!statusCurrent(parent) || !parent.snapshot) return;
    closeDetails();
    const dialog = el("dialog", void 0, "network-status-window network-details-window"), bar = el("header"), title = el("span", "Netzwerkverbindungsdetails"), close = el("button"), body = el("div", void 0, "network-status-content"), actions = el("footer", void 0, "network-status-buttons"), done = el("button", "Schlie\xDFen");
    dialog.id = "network-details-" + ++sequence;
    close.type = done.type = "button";
    close.setAttribute("aria-label", "Schlie\xDFen");
    bar.append(title, close);
    actions.append(done);
    dialog.append(bar, body, actions);
    doc.body.append(dialog);
    const record = { dialog, body, parent };
    details = record;
    done.onclick = () => dialog.close();
    const afterClose = () => {
      if (details === record) details = null;
      desktop.unregister(dialog.id);
      dialog.remove();
      if (statusCurrent(parent)) {
        desktop.show(parent.dialog.id);
        queueMicrotask(() => {
          if (statusCurrent(parent) && !details) parent.body.querySelector(".cp-network-details-button")?.focus({ preventScroll: true });
        });
      }
    };
    desktop.register(dialog, { bar, title, closeButton: close, icon: "/icons/control-panel/network.png", appId: "control-panel", minWidth: 375, minHeight: 444, resizable: false, rememberPlacement: false });
    dialog.addEventListener("close", afterClose);
    showWindow(dialog, 375, 444);
    drawDetails(parent);
  }
  async function loadStatus(record) {
    try {
      const snapshot = await api("/api/network/adapters/" + encodeURIComponent(record.adapterId), { signal: record.controller.signal });
      if (!statusCurrent(record)) return;
      record.snapshot = snapshot;
      record.error = null;
      drawStatus(record);
      if (record.openDetailsAfterLoad) {
        record.openDetailsAfterLoad = false;
        openDetails(record);
      }
    } catch (error) {
      if (!statusCurrent(record) || record.controller.signal.aborted) return;
      record.error = error.message;
      drawStatus(record);
    }
  }
  async function perform(record, value) {
    if (!statusCurrent(record) || record.busy || !["diagnose", "label"].includes(value?.action)) return;
    const state = getState(), profileId = String(state.userId), key = getContextKey();
    if (key !== record.context || !profileId) return;
    const capability = value.action === "label" ? "setDisplayName" : "diagnose";
    const payload = value.action === "label" ? { adapterId: record.adapterId, displayName: value.displayName, expectedRevision: value.expectedRevision, profileId } : { kind: value.kind, target: value.target, profileId };
    record.busy = true;
    record.error = null;
    record.actionController = new AbortController();
    drawStatus(record);
    try {
      if (networkDataFromAdaptersSnapshot(record.snapshot, getState()).capabilities?.[capability] !== true) await loadStatus(record);
      if (!statusCurrent(record)) return;
      if (networkDataFromAdaptersSnapshot(record.snapshot, getState()).capabilities?.[capability] !== true) throw Error("Aktuelle Adapterdaten oder die ben\xF6tigte Funktion sind nicht verf\xFCgbar.");
      const result = await api(value.action === "label" ? "/api/network/adapter-label" : "/api/network/diagnostics", { signal: record.actionController.signal, value: payload });
      if (!statusCurrent(record) || key !== getContextKey()) return;
      if (value.action === "diagnose") record.diagnostic = result;
      else {
        await loadStatus(record);
        await listRefresh?.();
      }
    } catch (error) {
      if (statusCurrent(record) && !record.actionController.signal.aborted) record.error = error.message;
    } finally {
      if (statusCurrent(record)) {
        record.busy = false;
        drawStatus(record);
      }
    }
  }
  function openStatus(adapterId, { showDetails = false } = {}) {
    refreshContext();
    if (!personalAdmin() || typeof adapterId !== "string" || !adapterId) return;
    closeStatus();
    const dialog = el("dialog", void 0, "network-status-window"), bar = el("header"), title = el("span", "Adapterstatus"), close = el("button"), body = el("div", void 0, "network-status-content"), actions = el("footer", void 0, "network-status-buttons"), done = el("button", "Schlie\xDFen");
    dialog.id = "network-status-" + ++sequence;
    close.type = done.type = "button";
    close.setAttribute("aria-label", "Schlie\xDFen");
    bar.append(title, close);
    actions.append(done);
    dialog.append(bar, body, actions);
    doc.body.append(dialog);
    const record = { dialog, title, body, adapterId, context: getContextKey(), controller: new AbortController(), snapshot: null, busy: false, error: null, openDetailsAfterLoad: showDetails };
    status = record;
    done.onclick = () => dialog.close();
    dialog.addEventListener("close", () => {
      if (details?.parent === record) closeDetails();
      record.controller.abort();
      record.actionController?.abort();
      if (status === record) status = null;
      desktop.unregister(dialog.id);
      dialog.remove();
    });
    desktop.register(dialog, { bar, title, closeButton: close, icon: "/icons/control-panel/network.png", appId: "control-panel", minWidth: 376, minHeight: 456, resizable: false, rememberPlacement: false });
    showWindow(dialog, 376, 456);
    body.replaceChildren(el("p", "Adapterdetails werden geladen \u2026"));
    void loadStatus(record);
  }
  async function renderInto(container, { page, signal, isCurrent }) {
    refreshContext();
    const key = getContextKey(), admin = personalAdmin();
    const view = { snapshot: null, busy: false, error: null, diagnostic: null, request: 0 };
    const draw = (snapshot, error = null) => {
      if (!isCurrent() || signal.aborted || key !== getContextKey()) return;
      const normalized = admin ? networkDataFromAdaptersSnapshot(snapshot, getState()) : networkDataFromTaskManager(snapshot, getState()), data = { ...normalized, ...view.diagnostic ? { diagnostic: view.diagnostic } : {} };
      const renderer = page === "adapter-settings" ? renderControlPanelAdapters : renderControlPanelNetwork;
      const diagnosticsOpen = container.querySelector(".cp-network-diagnostic")?.hidden === false;
      container.replaceChildren(renderer({ document: doc, data, availableTargets: targets(data), busy: view.busy, error: error || view.error, onAction: async (value) => {
        if (!current(key) || !isCurrent() || signal.aborted || view.busy || value?.action !== "diagnose" || data.capabilities?.diagnose !== true) return;
        const profileId = String(getState().userId);
        view.busy = true;
        view.error = null;
        draw(view.snapshot);
        try {
          const result = await api("/api/network/diagnostics", { signal, value: { kind: value.kind, target: value.target, profileId } });
          if (current(key) && isCurrent() && !signal.aborted) view.diagnostic = result;
        } catch (error2) {
          if (current(key) && isCurrent() && !signal.aborted) view.error = error2.message;
        } finally {
          if (current(key) && isCurrent() && !signal.aborted) {
            view.busy = false;
            draw(view.snapshot);
          }
        }
      }, onNavigate: (target, options = {}) => {
        if (!isCurrent() || key !== getContextKey() || !targets(data).has(target)) return;
        if (target === "adapter-details") openStatus(options.adapterId);
        else if (target === "adapter-address-details") openStatus(options.adapterId, { showDetails: true });
        else navigate(target);
      } }));
      if (page === "adapter-settings") applyAdapterIcons(container, data);
      if (diagnosticsOpen || view.diagnostic || view.error) {
        const section = container.querySelector(".cp-network-diagnostic");
        if (section) section.hidden = false;
      }
    };
    draw(null);
    const state = getState();
    if (!state.authenticated || state.readonly || state.shareEditing || page === "adapter-settings" && !admin) return;
    const refresh = async () => {
      if (!isCurrent() || signal.aborted || key !== getContextKey()) return;
      const revision = ++view.request;
      try {
        const snapshot = await api(admin ? "/api/network/adapters" : "/api/task-manager", { signal });
        if (revision !== view.request) return;
        view.snapshot = snapshot;
        draw(view.snapshot);
      } catch (error) {
        if (!signal.aborted && revision === view.request) draw(null, error.message);
      }
    };
    listRefresh = refresh;
    await refresh();
  }
  return { renderInto, openStatus, refreshContext, refresh: () => listRefresh?.(), dispose: () => {
    listRefresh = null;
    closeStatus();
  } };
}

// system-source.mjs
var own = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
var text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
var positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
var unknown = "Nicht verf\xFCgbar";
function systemDataFromTaskManager(snapshot, context = {}) {
  if (context.authenticated !== true || !["admin", "user"].includes(context.role) || context.shareEditing === true || context.readonly === true) {
    return { status: "restricted" };
  }
  if (!snapshot || !["host", "runtime"].includes(snapshot.scope) || !snapshot.host) {
    return { status: "unavailable" };
  }
  const host = snapshot.host;
  return {
    status: "ready",
    scope: snapshot.scope,
    platform: text(host.platform),
    architecture: text(host.arch),
    computerName: text(host.hostname),
    logicalProcessors: Number.isInteger(host.cpus) ? positive(host.cpus) : null,
    memoryBytes: positive(host.totalMemory),
    generatedAt: text(snapshot.generatedAt)
  };
}
function renderControlPanelSystem({ data = {}, availableTargets = {}, onNavigate, document: doc = globalThis.document } = {}) {
  const el = (tag, value, cls) => {
    const node = doc.createElement(tag);
    if (value !== void 0) node.textContent = value;
    if (cls) node.className = cls;
    return node;
  };
  const root = el("section", void 0, "cp-system-page");
  root.setAttribute("aria-label", "System");
  const canNavigate = (target) => typeof onNavigate === "function" && (availableTargets instanceof Set ? availableTargets.has(target) : own(availableTargets, target) && availableTargets[target] === true);
  const link = (label, target) => {
    const button = el("button", label, "cp-system-link");
    button.type = "button";
    button.dataset.systemTarget = target;
    if (["device-manager", "remote-settings", "system-protection", "advanced-system-settings", "computer-name"].includes(target)) {
      const shield = el("img");
      shield.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC9klEQVR4nHWTTWgUWRDH//W6O9M9HedDM4nG1ZjDqAtmkSD4gR5cmBzWvcRFBEUvsocFQUjMTS+7IGI23RfRk+IpjF4GJIZlWaIXUchmhVkisvEjgZhIjzHTY6Z7err7vaVHHWLQurxL/X9V9a9XhC/EwMBAd3t7+00i+hYA45wXS6XSccMwltbm0hrhtmw2O0REP/X29q5PJBKSEEJUKpVgcnLynSRJd2dmZi4bhjH7GWBwcPDHTCZzkTHW1dfXlyYi+fwDh5Wh4vf0z0gkU7CTF+qtra18YmLC5pxPl0olc2RkZEyOAJqmXcrlcjt1XZeP/CGR4lZx4vB23H60gM1JC1t6S3j25FxL9U0ncrlLEuf8UKFQ6AIwxiIAY0xPpVJy7s8E7e3WceL7rXi6JBC4PlriGZByDD17FWzsnIU3+YsSj8eZJEmxhhYfRxFCoLqyAigKHr+u4+lMGUrZBZNcyNIchNiNrqyDAOFnJsofX070wc+/52z4dYK+aCNwAzClhnezTyDJMqSYDjnGG3lRwSZACOEQkQjc9+QFClCrwvEjsQIRAJ7NwEGo1wOQLzUKCiGWm4AwDKccx9l+bf3p2OF9rYinG+OBSKD71hi8gNAiE5Ixhi0rr3B1jxeGYfhv04MgCP6xLMv7ri0DGQrU+DqoaRVEDCCGUOuA2tYFsakdpXQbLMsqB0EwtRpwr1gsLih7rvsVqw74KuB/6IIRoMU1aCmO1MtZ/HawxZ+enl70ff9OE2AYxkvLsuaJiL/1OuC4IQSPN76ZLBM6v+HQnSo2xGzsykihZVnPTNOcX71GuK57anR0dCHVc6X+6rmC1y8ceMscUR+J4n9om5uCeTTp5fP5+VqtNvBJ1wSYpvnGcZyz+Xy+rO/4tb5oH8DDv3x0LD5Hz7YlmCc3eoVCoeI4zrko94vHFMXQ0NAPmqbd6O/vT6uqGm1J2LYdjo+PL7uue2Z4eHj8q9e46iqzqqoaiqLsByD5vn+/Vqudj7xam/s/U4dOuqeP8wIAAAAASUVORK5CYII=";
      shield.alt = "";
      shield.width = 16;
      shield.height = 16;
      button.prepend(shield);
    }
    button.disabled = !canNavigate(target);
    if (button.disabled) button.title = "In dieser Webumgebung nicht verf\xFCgbar.";
    button.addEventListener("click", () => {
      if (canNavigate(target)) onNavigate(target);
    });
    return button;
  };
  const sidebar = el("nav", void 0, "cp-system-sidebar");
  sidebar.setAttribute("aria-label", "Systemaufgaben");
  sidebar.append(link("Startseite der Systemsteuerung", "home"));
  const tasks2 = el("div", void 0, "cp-system-tasks");
  for (const [label, target] of [
    ["Ger\xE4te-Manager", "device-manager"],
    ["Remoteeinstellungen", "remote-settings"],
    ["Computerschutz", "system-protection"],
    ["Erweiterte Systemeinstellungen", "advanced-system-settings"]
  ]) tasks2.append(link(label, target));
  const related = el("div", void 0, "cp-system-related");
  related.append(el("p", "Siehe auch"));
  for (const [label, target] of [["Wartungscenter", "action-center"], ["Windows Update", "windows-update"], ["Leistungsinformationen und -tools", "performance"]]) related.append(link(label, target));
  sidebar.append(tasks2, related);
  const main = el("div", void 0, "cp-system-main");
  main.append(el("h2", "Basisinformationen \xFCber den Computer anzeigen"));
  const ready = data?.status === "ready" && ["host", "runtime"].includes(data.scope);
  const facts = ready ? data : {};
  const note = el("p", ready ? data.scope === "host" ? "Angaben zum Server-Host." : "Angaben zur Server-Laufzeit; dies k\xF6nnen Containerdaten sein." : data?.status === "restricted" ? "Systemdaten sind in dieser Ansicht nicht freigegeben." : "Systemdaten sind derzeit nicht verf\xFCgbar.", "cp-system-source");
  note.setAttribute("role", "status");
  const section = (label, cls = "") => {
    const block = el("section", void 0, "cp-system-section " + cls);
    block.append(el("h3", label));
    main.append(block);
    return block;
  };
  const edition = section("Windows-Edition", "cp-system-edition");
  const editionText = el("div", void 0, "cp-system-section-content");
  editionText.append(el("p", "Windows-7-Webdesktop"), el("p", "Weboberfl\xE4che im Stil von Windows 7."));
  editionText.append(el("p", "Betriebssystem: " + (text(facts.platform) || unknown)), note);
  const originalLogo = el("img", void 0, "cp-system-original-logo");
  originalLogo.src = "data:image/png;base64,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";
  originalLogo.alt = "";
  originalLogo.width = 157;
  originalLogo.height = 151;
  edition.append(originalLogo, editionText);
  const system = section("System");
  const rows = (parent, entries) => {
    const list = el("dl", void 0, "cp-system-facts");
    for (const [label, value] of entries) list.append(el("dt", label), el("dd", value));
    parent.append(list);
  };
  const memory = positive(facts.memoryBytes);
  const memoryText = memory ? new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(memory / 1073741824) + " GiB" : unknown;
  const processors = positive(facts.logicalProcessors);
  rows(system, [
    ["Klassifikation:", "Keine Windows-Leistungsbewertung verf\xFCgbar"],
    ["Prozessor:", processors && Number.isInteger(processors) ? "Modell nicht verf\xFCgbar \xB7 " + processors + " logische Prozessoren" : unknown],
    ["Arbeitsspeicher (RAM):", memoryText],
    ["Systemtyp:", text(facts.architecture) || unknown],
    ["Stift- und Fingereingabe:", "Vom Server nicht erfasst"]
  ]);
  const name = section("Einstellungen f\xFCr Computernamen, Dom\xE4ne und Arbeitsgruppe");
  const nameContent = el("div", void 0, "cp-system-name-content");
  rows(nameContent, [["Computername:", text(facts.computerName) || unknown], ["Vollst\xE4ndiger Computername:", "Nicht erfasst"], ["Computerbeschreibung:", "Nicht erfasst"], ["Arbeitsgruppe:", "Nicht erfasst"]]);
  nameContent.append(link("Einstellungen \xE4ndern", "computer-name"));
  name.append(nameContent);
  const activation = section("Windows-Aktivierung");
  const activationText = el("div", void 0, "cp-system-section-content");
  activationText.append(el("p", "F\xFCr diesen Webdesktop ist kein Windows-Aktivierungsstatus verf\xFCgbar."));
  activation.append(activationText);
  root.append(sidebar, main);
  return root;
}

// entry.mjs
import { taskbarWorkArea as taskbarWorkArea2 } from "/taskbar-state.js";
import { createNotificationAreaProperties } from "/notification-area-properties.js";
import { createTaskbarProperties } from "/taskbar-properties.js";
import { renderDateTimePage } from "/date-time.js";
function createControlPanel({ desktop, getState, reload, accounts, users, display, programs }) {
  const el = (tag, text2, cls) => {
    const e = document.createElement(tag);
    if (text2 !== void 0) e.textContent = text2;
    if (cls) e.className = cls;
    return e;
  };
  const style = el("link");
  style.rel = "stylesheet";
  style.href = "/control-panel.css";
  document.head.append(style);
  let disposeDateTime = () => {
  }, moduleAbort, networkPanelHost;
  const networkPanels = () => networkPanelHost ??= createNetworkPanelHost({ desktop, getState, getContextKey: profileContext, navigate });
  const isModule = () => ["system-info", "network-center", "adapter-settings"].includes(page);
  const canReadModule = () => {
    const s = getState();
    return s.authenticated === true && ["user", "admin"].includes(s.role) && !s.readonly && !s.shareEditing;
  };
  function invalidateModule() {
    moduleAbort?.abort();
    moduleAbort = void 0;
  }
  async function renderModule(token) {
    const targetPage = page, context = profileContext(), controller = new AbortController();
    moduleAbort = controller;
    if (targetPage !== "system-info") return networkPanels().renderInto(body, { page: targetPage, signal: controller.signal, isCurrent: () => token === request && context === profileContext() && page === targetPage && !!dialog?.open });
    const renderer = targetPage === "system-info" ? renderControlPanelSystem : renderControlPanelNetwork, adapter = targetPage === "system-info" ? systemDataFromTaskManager : networkDataFromTaskManager;
    const draw = (snapshot) => {
      const state = getState();
      body.replaceChildren(renderer({ data: adapter(snapshot, state), availableTargets: /* @__PURE__ */ new Set(["home"]), onNavigate: (target) => {
        if (target === "home" && token === request && context === profileContext()) navigate("home");
      } }));
    };
    draw(null);
    if (!canReadModule()) return;
    try {
      const response = await fetch("/api/task-manager", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw Error("Systemdaten nicht verf\xFCgbar");
      const snapshot = await response.json();
      if (controller.signal.aborted || token !== request || context !== profileContext() || page !== targetPage || !dialog?.open) return;
      draw(snapshot);
    } catch (error) {
      if (controller.signal.aborted || token !== request || context !== profileContext() || page !== targetPage) return;
      draw(null);
    }
  }
  const profileContext = () => {
    const s = getState();
    return JSON.stringify([s.userId, s.actorId, !!s.authenticated, !!s.readonly, !!s.shareEditing, s.role]);
  };
  const notificationAreaProperties = createNotificationAreaProperties({ desktop, getPreferences: () => preferences().notificationArea, getTaskbar: () => preferences().taskbar, getVolume: () => preferences().sound, canEdit: () => {
    const s = getState();
    return !!s.authenticated && (s.shareEditing ? s.role === "admin" : !s.readonly);
  }, getContextKey: profileContext, save: async (value) => {
    const s = getState(), response = await fetch("/api/desktop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationArea: value, ...s.shareEditing ? { scope: "share" } : {} }) }), data = await response.json();
    if (!response.ok) throw Error(data.error || "Die Einstellungen konnten nicht gespeichert werden.");
    await reload();
  }, openControlPanel: (query) => {
    open();
    if (query) {
      search.value = query;
      render();
    }
  } });
  const taskbarProperties = createTaskbarProperties({ desktop, getState, reload, openCustomize: () => open("taskbar-programs"), openNotificationArea: () => notificationAreaProperties.open() });
  let dialog, body, search, toolbar, crumb, back, sidebar, view = "category", page = "home", accountKey = null, request = 0;
  const labels = { "system-info": "System", "network-center": "Netzwerk- und Freigabecenter", "adapter-settings": "Netzwerkverbindungen", "date-time": "Datum und Uhrzeit", home: "Alle Systemsteuerungselemente", avatar: "Eigenes Kontobild \xE4ndern", colors: "Fensterfarbe und Darstellung", wallpapers: "Desktophintergrund", sound: "Sound", background: "Anpassung", display: "Anzeige", desktop: "Desktopsymbole", taskbar: "Taskleiste und Startmen\xFC", accounts: "Benutzerkonten", permissions: "Ordnerberechtigungen", share: "\xD6ffentlicher Desktop" };
  function breadcrumb(label) {
    if (crumb) crumb.textContent = label ? " \u203A " + label : " \u203A";
    if (toolbar) toolbar.hidden = page !== "home";
    if (back) back.disabled = page === "home";
  }
  accounts.setHost({ open: (next) => open(next), changed: (key, crumbs) => {
    accountKey = key;
    renderSidebar(key);
    breadcrumb(crumbs.map((c) => c[0]).filter((v, i, a) => i === 0 || v !== a[i - 1]).join(" \u203A "));
  } });
  const entries = [
    ["system-info", "System", "Basisinformationen \xFCber den Computer anzeigen", "computer", "System und Sicherheit", () => navigate("system-info")],
    ["network-center", "Netzwerk- und Freigabecenter", "Netzwerkstatus und -aufgaben anzeigen", "network", "Netzwerk und Internet", () => navigate("network-center")],
    ["sound", "Sound", "Wiedergabe, Mikrofon und Soundschema", "settings", "Hardware und Sound", () => window.openSoundSettings?.()],
    ["date-time", "Datum und Uhrzeit", "Kalender, Uhr und pers\xF6nliche Zeitzone", "settings", "Zeit, Sprache und Region", () => navigate("date-time")],
    ["background", "Anpassung", "Desktophintergrund, Fensterfarbe und Transparenz", "personalization", "Darstellung und Anpassung", () => navigate("background")],
    ["display", "Anzeige", "Bildschirmaufl\xF6sung und mehrere Bildschirme", "display", "Darstellung und Anpassung", () => navigate("display")],
    ["desktop", "Desktopsymbole", "Symbole auf dem Desktop ein- oder ausblenden", "display", "Darstellung und Anpassung", () => navigate("desktop")],
    ["notification-area", "Infobereichsymbole", "Symbole und Benachrichtigungen auf der Taskleiste", "settings", "Darstellung und Anpassung", () => notificationAreaProperties.open()],
    ["taskbar", "Taskleiste und Startmen\xFC", "Angeheftete Programme ausw\xE4hlen", "application", "Darstellung und Anpassung", () => navigate("taskbar")],
    ["accounts", "Benutzerkonten", "Profilbild und eigenes Benutzerkonto", "users", "Benutzerkonten", () => navigate("accounts")],
    ["users", "Lokale Benutzer und Gruppen", "Benutzer und Gruppenmitgliedschaften verwalten", "users", "System und Sicherheit", users, true],
    ["permissions", "Ordnerberechtigungen", "Zugriff f\xFCr Benutzer und Gruppen festlegen", "settings", "System und Sicherheit", () => navigate("permissions"), true],
    ["share", "\xD6ffentlicher Desktop", "\xD6ffentliche Share-Ansicht verwalten", "network", "System und Sicherheit", () => navigate("share"), true]
  ];
  const categories = [
    ["system", "System und Sicherheit", "/icons/control-panel/system.png", ["system-info", "users", "permissions", "share"]],
    ["network", "Netzwerk und Internet", "/icons/control-panel/network.png", ["network-center"]],
    ["hardware", "Hardware und Sound", "/icons/control-panel/hardware.png", ["sound"]],
    ["programs", "Programme", "/icons/control-panel/programs.png", []],
    ["accounts", "Benutzerkonten und Jugendschutz", "/icons/control-panel/accounts.png", ["accounts"]],
    ["appearance", "Darstellung und Anpassung", "/icons/control-panel/appearance.png", ["background", "wallpapers", "display"]],
    ["region", "Zeit, Sprache und Region", "/icons/control-panel/region.png", ["date-time"]],
    ["access", "Erleichterte Bedienung", "/icons/control-panel/access.png", []]
  ];
  function categoryLinks(group, parent) {
    for (const id of group[3]) {
      if (id === "wallpapers") {
        const b2 = el("button", "Desktophintergrund \xE4ndern", "cp-category-link");
        b2.disabled = !getState().authenticated;
        b2.onclick = () => navigate("wallpapers");
        parent.append(b2);
        continue;
      }
      const item = entries.find((e) => e[0] === id);
      if (!item) continue;
      const label = { background: "Design \xE4ndern", display: "Bildschirmaufl\xF6sung anpassen", accounts: "Benutzerkonten hinzuf\xFCgen/entfernen", "date-time": "Datum und Uhrzeit einstellen", sound: "Systemsounds \xE4ndern" }[id] || item[1], b = el("button", label, "cp-category-link");
      b.disabled = !!(item[6] && (getState().role !== "admin" || getState().shareEditing)) || !getState().authenticated;
      b.onclick = item[5];
      parent.append(b);
    }
  }
  function renderCategories() {
    const grid = el("div", void 0, "cp-native-categories");
    for (const column of [categories.slice(0, 4), categories.slice(4)]) {
      const list = el("div", void 0, "cp-category-column");
      for (const group of column) {
        const section = el("section", void 0, "cp-native-category"), image = el("img"), content = el("div"), heading = el("button", group[1], "cp-category-title");
        image.src = group[2];
        image.alt = "";
        heading.onclick = () => navigate("category:" + group[0]);
        content.append(heading);
        categoryLinks(group, content);
        section.append(image, content);
        list.append(section);
      }
      grid.append(list);
    }
    body.append(grid);
  }
  function categoryTargets() {
    const s = getState(), editable = s.authenticated && (s.shareEditing ? s.role === "admin" : !s.readonly), targets = new Set(editable ? ["background", "wallpapers", "colors", "display", "taskbar", "sound", "date-time"] : []);
    if (s.authenticated && !s.readonly && !s.shareEditing) targets.add("accounts");
    if (canReadModule()) {
      targets.add("system-info");
      targets.add("network-center");
    }
    return targets;
  }
  function renderCategory() {
    const group = categories.find((c) => "category:" + c[0] === page);
    if (!group) return;
    breadcrumb(group[1]);
    const context = profileContext(), categoryPage = page, token = request;
    body.append(renderControlPanelCategory({ categoryId: group[0], availableTargets: categoryTargets(), onNavigate: (target) => {
      if (token !== request || page !== categoryPage || profileContext() !== context || !categoryTargets().has(target)) return;
      if (target === "sound") window.openSoundSettings?.();
      else navigate(target);
    } }));
  }
  function renderSidebar(key = page) {
    if (!sidebar) return;
    sidebar.replaceChildren();
    const home = el("button", "Startseite der Systemsteuerung");
    home.onclick = () => navigate("home");
    sidebar.append(home);
    if (key === "background") {
      for (const [label, target] of [["Desktopsymbole \xE4ndern", "desktop"], ["Mauszeiger \xE4ndern", null], ["Eigenes Kontobild \xE4ndern", "avatar"]]) {
        const b = el("button", label);
        b.disabled = !target;
        if (target) b.onclick = () => navigate(target);
        else b.title = "Mauszeiger-Einstellungen sind noch nicht verf\xFCgbar.";
        sidebar.append(b);
      }
      const related2 = el("div", void 0, "cp-related");
      related2.append(el("small", "Siehe auch"));
      for (const [label, target] of [["Anzeige", "display"], ["Taskleiste und Startmen\xFC", "taskbar"], ["Center f\xFCr erleichterte Bedienung", "category:access"]]) {
        const b = el("button", label);
        b.onclick = () => navigate(target);
        related2.append(b);
      }
      sidebar.append(related2);
      sidebar.hidden = false;
      return;
    }
    const appearance = ["background", "wallpapers", "colors", "desktop", "display", "taskbar"];
    const category = key.startsWith("category:") ? categories.find((c) => "category:" + c[0] === key)?.[1] : appearance.includes(key) ? "Darstellung und Anpassung" : key === "date-time" ? "Zeit, Sprache und Region" : ["permissions", "share", "share-settings"].includes(key) ? "System und Sicherheit" : key === "home" ? null : "Benutzerkonten";
    const related = category ? entries.filter((e) => e[4] === category && e[0] !== key) : [];
    if (appearance.includes(key)) {
      for (const [id, name] of [["background", "Anpassung"], ["desktop", "Desktopsymbole \xE4ndern"], ["wallpapers", "Desktophintergrund"], ["colors", "Fensterfarbe"], ["display", "Anzeige"], ["taskbar", "Taskleiste und Startmen\xFC"]]) {
        if (id === key) continue;
        const b = el("button", name);
        b.onclick = () => navigate(id);
        sidebar.append(b);
      }
    } else for (const item of related) {
      const b = el("button", item[1]);
      b.onclick = item[5];
      sidebar.append(b);
    }
    sidebar.hidden = key === "home" || key === "colors";
  }
  function navigate(next) {
    if (next === "notification-area" || next === "system-icons") {
      notificationAreaProperties.open(next === "system-icons" ? "system" : "icons");
      return;
    }
    if (next === "taskbar") {
      taskbarProperties.open();
      return;
    }
    page = next;
    accountKey = null;
    search.value = "";
    render();
  }
  function preferences() {
    const s = getState();
    return (s.shareEditing ? s.publicDesktop : s.desktop) || {};
  }
  async function save(patch, status) {
    try {
      const s = getState();
      if (!s.authenticated && !s.shareEditing) throw Error("Bitte zuerst anmelden.");
      const response = await fetch("/api/desktop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...patch, ...s.shareEditing ? { scope: "share" } : {} }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Speichern fehlgeschlagen.");
      await reload();
      status.textContent = "Einstellungen gespeichert.";
    } catch (e) {
      status.textContent = e.message;
    }
  }
  function check(label, checked, container) {
    const row = el("label", void 0, "cp-check"), input = el("input");
    input.type = "checkbox";
    input.checked = checked;
    input.disabled = !getState().authenticated && !getState().shareEditing;
    row.append(input, document.createTextNode(label));
    container.append(row);
    return input;
  }
  function settings() {
    const p = preferences(), status = el("p", "", "cp-status");
    status.setAttribute("role", "status");
    body.append(el("h2", page === "desktop" ? "Desktopsymbole \xE4ndern" : "Taskleiste und Startmen\xFC"));
    const fields = el("div", void 0, "cp-fields");
    body.append(fields);
    let patch;
    if (page === "desktop") {
      const visible = check("Desktopsymbole anzeigen", p.showIcons !== false, fields), computer = check("Computer", !(p.hiddenIcons || []).includes("shell-computer"), fields), home = check("Benutzerordner", !(p.hiddenIcons || []).includes("shell-home"), fields);
      fields.append(el("p", "Der Papierkorb bleibt als Standardsymbol erhalten. Verkn\xFCpfungen und Dateien verwalten Sie im Desktop-Ordner."));
      patch = () => ({ showIcons: visible.checked, hiddenIcons: [...(p.hiddenIcons || []).filter((x) => !["shell-home", "shell-computer"].includes(x)), ...!computer.checked ? ["shell-computer"] : [], ...!home.checked ? ["shell-home"] : []] });
    } else {
      const list = programs(), start = new Set(p.startPins ?? list.map((x) => x.id)), pins = new Set(p.pins ?? ["browser", "explorer"]), table = el("table", void 0, "cp-pins"), head = el("tr");
      for (const name of ["Programm", "Startmen\xFC", "Taskleiste"]) head.append(el("th", name));
      table.append(head);
      const rows = [];
      for (const app of list) {
        const row = el("tr"), name = el("td", app.name), a = el("td"), b = el("td");
        const sc = check(app.name + " im Startmen\xFC", start.has(app.id), a), tc = check(app.name + " in der Taskleiste", pins.has(app.id), b);
        a.querySelector("label").lastChild.textContent = "";
        b.querySelector("label").lastChild.textContent = "";
        row.append(name, a, b);
        table.append(row);
        rows.push({ id: app.id, sc, tc });
      }
      fields.append(table);
      patch = () => ({ startPins: rows.filter((x) => x.sc.checked).map((x) => x.id), pins: rows.filter((x) => x.tc.checked).map((x) => x.id) });
    }
    const buttons = el("div", void 0, "cp-actions"), apply = el("button", "\xDCbernehmen"), cancel = el("button", "Abbrechen");
    apply.disabled = !getState().authenticated && !getState().shareEditing;
    apply.onclick = () => save(patch(), status);
    cancel.onclick = () => navigate("home");
    buttons.append(apply, cancel);
    body.append(status, buttons);
  }
  function card(item, compact = false) {
    const [id, name, description, icon, , action2, admin] = item, b = el("button", void 0, "cp-item");
    b.dataset.setting = id;
    const image = el("img");
    image.src = id === "background" ? "/icons/win7-settings/personalization.png" : id === "sound" ? "/icons/win7-settings/sound.png" : id === "date-time" ? "/icons/win7-settings/date-time.png" : "/icons/filetypes/" + icon + ".ico?v=1";
    image.alt = "";
    const text2 = el("span"), title = el("strong", name);
    text2.append(title);
    if (!compact) text2.append(el("small", description));
    b.append(image, text2);
    b.disabled = admin && (getState().role !== "admin" || getState().shareEditing) || !getState().authenticated;
    b.onclick = action2;
    return b;
  }
  async function render() {
    if (!body) return;
    const token = ++request;
    invalidateModule();
    disposeDateTime();
    disposeDateTime = () => {
    };
    accounts.dispose();
    body.replaceChildren();
    const q = search.value.trim().toLocaleLowerCase("de");
    if (q) page = "home";
    breadcrumb(page === "home" && view === "category" ? "" : labels[page] || labels.home);
    renderSidebar();
    body.classList.toggle("cp-subpage", page !== "home");
    const ownModule = isModule() && !q;
    body.classList.toggle("cp-module-body", ownModule);
    body.parentElement.classList.toggle("cp-module-host", ownModule);
    if (ownModule) {
      sidebar.hidden = true;
      await renderModule(token);
      return;
    }
    if (["background", "colors", "wallpapers", "accounts", "permissions", "share", "avatar"].includes(page) && !q) {
      await accounts.renderInto(body, page);
      if (token !== request) return;
      return;
    }
    if (page === "date-time" && !q) {
      disposeDateTime = renderDateTimePage(body, { getState, save });
      return;
    }
    if (page === "display" && !q) {
      display(body, () => navigate("home"));
      return;
    }
    if (page.startsWith("category:") && !q) {
      renderCategory();
      return;
    }
    if (page !== "home" && !q) {
      settings();
      return;
    }
    body.append(el("h2", "Einstellungen des Computers anpassen"));
    const list = entries.filter((e) => !q || e.slice(1, 5).join(" ").toLocaleLowerCase("de").includes(q));
    const grid = el("div", void 0, "cp-grid cp-" + (q ? "small" : view));
    if (view === "category" && !q) {
      renderCategories();
      return;
    } else for (const item of [...list].sort((a, b) => a[1].localeCompare(b[1], "de"))) grid.append(card(item, true));
    if (!list.length) grid.append(el("p", "Keine passenden Einstellungen gefunden."));
    body.append(grid);
  }
  function open(next) {
    notificationAreaProperties.refresh();
    if (next === "notification-area" || next === "system-icons") return notificationAreaProperties.open(next === "system-icons" ? "system" : "icons");
    if (next === "taskbar") return taskbarProperties.open();
    const fresh = !dialog?.open;
    if (fresh) page = "home";
    if (!dialog) {
      dialog = el("dialog", void 0, "control-panel-window");
      dialog.id = "control-panel";
      const bar = el("header"), title = el("span", "Systemsteuerung"), min = el("button"), max = el("button"), close = el("button");
      title.id = "control-panel-title";
      bar.append(title, min, max, close);
      const nav = el("div", void 0, "explorer-navigation cp-navigation"), pair = el("span", void 0, "nav-pair"), backButton = el("button", "", "nav-round nav-back"), forward = el("button", "", "nav-round nav-forward");
      back = backButton;
      back.title = "Zur\xFCck";
      back.setAttribute("aria-label", back.title);
      back.onclick = async () => {
        if (accountKey && await accounts.back()) return;
        navigate("home");
      };
      forward.disabled = true;
      forward.setAttribute("aria-label", "Vorw\xE4rts");
      pair.append(back, forward);
      const address = el("div", void 0, "explorer-address"), home = el("button", "Systemsteuerung");
      crumb = el("span", " \u203A Alle Systemsteuerungselemente");
      home.onclick = () => navigate("home");
      address.append(home, crumb);
      search = el("input");
      search.type = "search";
      search.placeholder = "Systemsteuerung durchsuchen";
      search.setAttribute("aria-label", search.placeholder);
      search.oninput = render;
      nav.append(pair, address, search);
      const client = el("div", void 0, "cp-client"), side = el("aside");
      sidebar = side;
      const content = el("section", void 0, "cp-content"), viewLabel = el("label", "Anzeige: ", "cp-view"), select = el("select");
      toolbar = viewLabel;
      select.setAttribute("aria-label", "Anzeige der Systemsteuerung");
      for (const [value, text2] of [["category", "Kategorie"], ["large", "Gro\xDFe Symbole"], ["small", "Kleine Symbole"]]) {
        const o = el("option", text2);
        o.value = value;
        select.append(o);
      }
      select.onchange = () => {
        view = select.value;
        page = "home";
        render();
      };
      toolbar.append(select);
      body = el("div", void 0, "cp-body");
      content.append(toolbar, body);
      client.append(side, content);
      dialog.append(bar, nav, client);
      document.body.append(dialog);
      desktop.register(dialog, { bar, title, minimizeButton: min, maximizeButton: max, closeButton: close, appId: "control-panel", rememberPlacement: false, icon: "/icons/control-panel.png", minWidth: 650, minHeight: 420 });
      dialog.workspaceState = () => ({ type: "control-panel", page: accountKey || page });
      dialog.addEventListener("close", () => {
        ++request;
        invalidateModule();
        networkPanelHost?.dispose();
        if (isModule()) body.replaceChildren();
        accounts.dispose();
        disposeDateTime();
      });
    }
    if (next) {
      page = next;
      search.value = "";
    }
    render();
    desktop.show(dialog.id);
    if (fresh) {
      const area = taskbarWorkArea2({ width: innerWidth, height: innerHeight }, preferences().taskbar), workWidth = Math.max(1, area.width), workHeight = Math.max(1, area.height), width = Math.max(1, Math.min(800, workWidth - 24)), height = Math.max(1, Math.min(601, workHeight - 24)), left = area.left + Math.max(0, (area.width - width) / 2), top = area.top + Math.max(0, (area.height - height) / 2);
      desktop.applyWorkspaceGeometry(dialog.id, { mode: "normal", left: (left - area.left) / workWidth, top: (top - area.top) / workHeight, width: width / workWidth, height: height / workHeight });
    }
    return dialog;
  }
  return { open, refresh: () => {
    accounts.refreshAppearance?.();
    notificationAreaProperties.refresh();
    const contextChanged = networkPanelHost?.refreshContext();
    if (networkPanelHost && ["network-center", "adapter-settings"].includes(page) && !contextChanged) {
      networkPanelHost.refresh();
      return;
    }
    if (isModule() || page.startsWith("category:")) {
      ++request;
      invalidateModule();
      body?.replaceChildren();
      if (dialog?.open) render();
    }
  } };
}
export {
  createControlPanel
};
