// mobile/src/data/legalTexts.ts

import { Language } from '../i18n/i18nContext';

export type LegalDocType = 'cgu' | 'cgv' | 'mentions' | 'confidentialite';

export const legalTexts: Record<LegalDocType, { title: Record<Language, string>; content: Record<Language, string> }> = {
  cgu: {
    title: {
      fr: "Conditions Générales d'Utilisation",
      en: 'Terms of Service',
      es: 'Condiciones Generales de Uso',
      ar: 'شروط الاستخدام العامة',
      pt: 'Termos de Uso',
    },
    content: {
      fr: `Dernière mise à jour : 7 mars 2026

PRÉAMBULE

La société HopDrop (ci-après « HopDrop ») exploite une plateforme numérique accessible via une application mobile permettant la mise en relation de personnes souhaitant faire livrer des colis (ci-après « Vendeurs ») avec des prestataires indépendants de livraison (ci-après « Livreurs »).

HopDrop agit exclusivement en qualité d'intermédiaire technique et n'est partie à aucun contrat de prestation de livraison conclu entre les Utilisateurs.

Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la Plateforme par tout Utilisateur.


ARTICLE 1 — DÉFINITIONS

« Plateforme » : L'application mobile HopDrop et l'ensemble des services numériques associés, opérés par HopDrop en qualité d'intermédiaire technique.

« Utilisateur » : Toute personne physique ou morale inscrite sur la Plateforme, qu'elle soit Vendeur ou Livreur.

« Vendeur » : Personne physique ou morale utilisant la Plateforme pour faire livrer un colis par un Livreur indépendant. Le Vendeur agit en qualité de mandant.

« Livreur » : Prestataire indépendant inscrit sur la Plateforme, disposant d'un statut d'indépendant valide (auto-entrepreneur, SASU, etc.), proposant ses services de livraison aux Vendeurs.

« Mission » : Prestation de livraison effectuée par un Livreur pour le compte d'un Vendeur, comprenant la récupération du colis, son transport et son dépôt au point de destination convenu.

« Commission » : Rémunération perçue par HopDrop en contrepartie de son service d'intermédiation, fixée à 1€ par Mission.

« Fonds Transitoires » : Sommes versées par le Vendeur et détenues temporairement par HopDrop, agissant en qualité de mandataire, pour le compte du Livreur jusqu'à confirmation de la livraison.


ARTICLE 2 — OBJET

Les présentes CGU ont pour objet de définir les conditions d'accès et d'utilisation de la Plateforme.

HopDrop fournit un service d'intermédiation technique permettant :
— La mise en relation de Vendeurs et de Livreurs indépendants ;
— La facilitation de la conclusion de contrats de prestation entre Vendeurs et Livreurs ;
— La gestion sécurisée des flux financiers liés aux Missions.

HopDrop n'est pas prestataire de livraison. HopDrop n'est pas employeur des Livreurs. Le contrat de prestation de livraison est conclu directement entre le Vendeur et le Livreur. HopDrop ne garantit ni la disponibilité de Livreurs ni le résultat des Missions.


ARTICLE 3 — INSCRIPTION ET CONDITIONS D'ACCÈS

3.1 Conditions communes
L'inscription sur la Plateforme est ouverte à toute personne physique âgée de 18 ans révolus ou à toute personne morale valablement constituée. L'Utilisateur s'engage à fournir des informations exactes et à les maintenir à jour. L'acceptation des présentes CGU est obligatoire pour l'utilisation de la Plateforme.

3.2 Conditions spécifiques Vendeurs
L'inscription en tant que Vendeur est ouverte aux particuliers et aux professionnels sans condition particulière au-delà de celles prévues à l'article 3.1.

3.3 Conditions spécifiques Livreurs
L'inscription en tant que Livreur est soumise aux conditions supplémentaires suivantes :
— Disposer d'un statut d'indépendant valide (auto-entrepreneur, EURL, SASU, etc.) avec un numéro SIRET actif ;
— Fournir les documents justificatifs requis : pièce d'identité recto/verso, extrait Kbis ou justificatif SIRET, permis de conduire (si véhicule motorisé), carte grise (si véhicule) ;
— Disposer d'une assurance responsabilité civile professionnelle en cours de validité (recommandé) ;
— Faire l'objet d'une vérification préalable par HopDrop avant activation du compte.


ARTICLE 4 — FONCTIONNEMENT DU SERVICE

4.1 Demande de prise en charge (Vendeur)
Le Vendeur crée une demande de prise en charge en renseignant : la description du colis, l'adresse de récupération, le point de dépôt souhaité (point relais, bureau de poste), le créneau horaire souhaité, et toute instruction particulière.

4.2 Acceptation d'une Mission (Livreur)
Le Livreur consulte librement les Missions disponibles à proximité de sa position géographique. L'acceptation d'une Mission est volontaire et constitue un engagement à la réaliser dans les conditions convenues. Le Livreur n'est soumis à aucune obligation d'acceptation et détermine librement le nombre de Missions qu'il souhaite effectuer.

4.3 Réalisation d'une Mission
La Mission comprend : la récupération du colis à l'adresse indiquée par le Vendeur, la vérification de l'emballage avec photo de confirmation, le transport du colis jusqu'au point de dépôt, le dépôt du colis et la confirmation par photo ou ticket. Le client (destinataire) dispose d'un délai de 12 heures pour confirmer la réception. Passé ce délai, la livraison est automatiquement confirmée.

4.4 Annulation
Le Vendeur peut annuler sa demande tant qu'aucun Livreur ne l'a acceptée. Le Livreur peut annuler une Mission acceptée avant la récupération du colis. Des pénalités pourront être appliquées en cas d'annulations abusives ou répétées.


ARTICLE 5 — TARIFICATION ET PAIEMENT

5.1 Prix de la prestation
Le prix d'une Mission est fixé à 10€ toutes taxes comprises, quelle que soit la taille du colis. Ce prix est affiché au Vendeur avant toute confirmation.

5.2 Répartition du prix
Le prix de 10€ se décompose comme suit :
— 9€ correspondent à la rémunération du Livreur pour sa prestation de livraison ;
— 1€ correspond à la commission d'intermédiation perçue par HopDrop.

5.3 Flux de paiement
Le paiement est effectué par le Vendeur via la solution de paiement sécurisée Stripe. Les fonds sont séquestrés par HopDrop, agissant en qualité de mandataire pour le compte du Livreur, jusqu'à confirmation de la livraison. Après confirmation de la livraison, 9€ sont versés au Livreur via Stripe Connect et 1€ sont conservés par HopDrop au titre de sa commission d'intermédiation. Le versement au Livreur intervient dans un délai de 7 jours ouvrés suivant la confirmation de livraison.

5.4 Nature de la commission
La commission de 1€ rémunère exclusivement le service d'intermédiation fourni par HopDrop. HopDrop ne perçoit aucune rémunération au titre de la prestation de livraison elle-même.


ARTICLE 6 — RESPONSABILITÉS

6.1 Responsabilité de HopDrop
HopDrop s'engage à assurer le bon fonctionnement technique de la Plateforme, la sécurité des transactions de paiement via Stripe, et la vérification initiale des documents fournis par les Livreurs.

En sa qualité d'intermédiaire technique, HopDrop ne saurait être tenue responsable :
— De la qualité de la prestation de livraison effectuée par les Livreurs ;
— Des dommages causés aux colis pendant le transport ;
— Du comportement des Utilisateurs ;
— Des litiges survenant entre Vendeurs et Livreurs.

Tout litige relatif à la prestation de livraison doit être réglé directement entre le Vendeur et le Livreur concernés. HopDrop pourra, à sa discrétion, intervenir en qualité de médiateur.

6.2 Responsabilité du Livreur
Le Livreur est seul responsable de l'exécution conforme de la Mission, du respect des délais convenus, de l'intégrité du colis pendant le transport, et du maintien d'une assurance responsabilité civile professionnelle valide le cas échéant.

6.3 Responsabilité du Vendeur
Le Vendeur est responsable de l'exactitude des informations fournies (adresse, description du colis), de la conformité du colis aux règles en vigueur (pas de produits interdits, dangereux ou illicites), et de sa disponibilité au créneau convenu pour la récupération.


ARTICLE 7 — ASSURANCE

Il est recommandé au Livreur de disposer d'une assurance responsabilité civile professionnelle couvrant son activité de livraison. HopDrop se réserve le droit de demander une attestation d'assurance à tout moment. HopDrop n'est pas l'assureur des colis transportés.


ARTICLE 8 — PROPRIÉTÉ INTELLECTUELLE

La marque HopDrop, le logo, le design de l'application et l'ensemble des contenus de la Plateforme sont la propriété exclusive de HopDrop. Toute reproduction, représentation ou utilisation non autorisée est interdite. L'inscription sur la Plateforme confère à l'Utilisateur une licence d'utilisation personnelle, non exclusive et non transférable de l'application.


ARTICLE 9 — DONNÉES PERSONNELLES

HopDrop collecte et traite les données personnelles des Utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés. Les détails du traitement des données sont décrits dans la Politique de Confidentialité accessible depuis l'application.


ARTICLE 10 — RÉSILIATION

Tout Utilisateur peut résilier son compte à tout moment, sans préavis ni indemnité, en contactant le support à l'adresse support@hopdrop.fr. HopDrop peut suspendre ou résilier le compte d'un Utilisateur en cas de manquement aux présentes CGU, de fraude ou tentative de fraude, de comportement portant atteinte aux autres Utilisateurs, ou d'inactivité prolongée. La résiliation entraîne la suppression du compte et des données associées dans les conditions prévues par la Politique de Confidentialité.


ARTICLE 11 — MODIFICATION DES CGU

HopDrop se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront informés de toute modification par notification dans l'application au moins 15 jours avant leur entrée en vigueur. La poursuite de l'utilisation de la Plateforme après l'entrée en vigueur des modifications vaut acceptation des nouvelles CGU.


ARTICLE 12 — DROIT APPLICABLE ET LITIGES

Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. Conformément aux articles L.611-1 et suivants du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige. À défaut de résolution amiable, les tribunaux français seront seuls compétents.`,

      en: `Last updated: March 7, 2026

PREAMBLE

HopDrop (hereinafter "HopDrop") operates a digital platform accessible via a mobile application that connects people wishing to have parcels delivered (hereinafter "Vendors") with independent delivery service providers (hereinafter "Carriers").

HopDrop acts exclusively as a technical intermediary and is not a party to any delivery service contract concluded between Users.

These Terms of Service (hereinafter "ToS") govern access to and use of the Platform by all Users.


ARTICLE 1 — DEFINITIONS

"Platform": The HopDrop mobile application and all associated digital services, operated by HopDrop as a technical intermediary.

"User": Any natural or legal person registered on the Platform, whether as a Vendor or Carrier.

"Vendor": A natural or legal person using the Platform to have a parcel delivered by an independent Carrier. The Vendor acts as a principal.

"Carrier": An independent service provider registered on the Platform, holding a valid self-employed status (sole proprietor, SAS, etc.), offering delivery services to Vendors.

"Mission": A delivery service performed by a Carrier on behalf of a Vendor, including parcel pickup, transport, and drop-off at the agreed destination point.

"Commission": Remuneration received by HopDrop in return for its intermediation service, set at \u20AC1 per Mission.

"Escrow Funds": Amounts paid by the Vendor and temporarily held by HopDrop, acting as agent, on behalf of the Carrier until delivery confirmation.


ARTICLE 2 — PURPOSE

These ToS define the conditions of access to and use of the Platform.

HopDrop provides a technical intermediation service enabling:
— Connecting Vendors with independent Carriers;
— Facilitating the conclusion of service contracts between Vendors and Carriers;
— Secure management of financial flows related to Missions.

HopDrop is not a delivery service provider. HopDrop is not an employer of Carriers. The delivery service contract is concluded directly between the Vendor and the Carrier. HopDrop does not guarantee the availability of Carriers or the outcome of Missions.


ARTICLE 3 — REGISTRATION AND ACCESS CONDITIONS

3.1 General conditions
Registration on the Platform is open to any natural person aged 18 or over, or any duly constituted legal entity. The User agrees to provide accurate information and keep it up to date. Acceptance of these ToS is mandatory for using the Platform.

3.2 Vendor-specific conditions
Registration as a Vendor is open to individuals and professionals without specific conditions beyond those set out in Article 3.1.

3.3 Carrier-specific conditions
Registration as a Carrier is subject to the following additional conditions:
— Holding a valid self-employed status (sole proprietor, EURL, SAS, etc.) with an active SIRET number;
— Providing the required supporting documents: front/back ID, Kbis extract or SIRET certificate, driving license (if motorized vehicle), vehicle registration (if vehicle);
— Having valid professional liability insurance (recommended);
— Undergoing a preliminary verification by HopDrop before account activation.


ARTICLE 4 — SERVICE OPERATION

4.1 Pickup request (Vendor)
The Vendor creates a pickup request by providing: parcel description, pickup address, desired drop-off point (relay point, post office), desired time slot, and any special instructions.

4.2 Mission acceptance (Carrier)
The Carrier freely browses available Missions near their geographic location. Accepting a Mission is voluntary and constitutes a commitment to complete it under the agreed conditions. The Carrier is under no obligation to accept and freely determines the number of Missions they wish to perform.

4.3 Mission completion
The Mission includes: picking up the parcel at the address indicated by the Vendor, verifying the packaging with a confirmation photo, transporting the parcel to the drop-off point, dropping off the parcel and confirming with a photo or ticket. The recipient has 12 hours to confirm receipt. After this period, the delivery is automatically confirmed.

4.4 Cancellation
The Vendor may cancel their request as long as no Carrier has accepted it. The Carrier may cancel an accepted Mission before picking up the parcel. Penalties may be applied in case of abusive or repeated cancellations.


ARTICLE 5 — PRICING AND PAYMENT

5.1 Service price
The price of a Mission is set at \u20AC10 including all taxes, regardless of parcel size. This price is displayed to the Vendor before any confirmation.

5.2 Price breakdown
The \u20AC10 price breaks down as follows:
— \u20AC9 corresponds to the Carrier's remuneration for the delivery service;
— \u20AC1 corresponds to HopDrop's intermediation commission.

5.3 Payment flow
Payment is made by the Vendor via the secure payment solution Stripe. Funds are held in escrow by HopDrop, acting as agent on behalf of the Carrier, until delivery confirmation. After delivery confirmation, \u20AC9 is paid to the Carrier via Stripe Connect and \u20AC1 is retained by HopDrop as its intermediation commission. Payment to the Carrier is made within 7 business days following delivery confirmation.

5.4 Commission nature
The \u20AC1 commission exclusively remunerates the intermediation service provided by HopDrop. HopDrop receives no remuneration for the delivery service itself.


ARTICLE 6 — LIABILITY

6.1 HopDrop's liability
HopDrop undertakes to ensure the proper technical functioning of the Platform, the security of payment transactions via Stripe, and the initial verification of documents provided by Carriers.

As a technical intermediary, HopDrop cannot be held liable for:
— The quality of the delivery service provided by Carriers;
— Damage caused to parcels during transport;
— User behavior;
— Disputes between Vendors and Carriers.

Any dispute relating to the delivery service must be resolved directly between the Vendor and the Carrier concerned. HopDrop may, at its discretion, intervene as a mediator.

6.2 Carrier's liability
The Carrier is solely responsible for the proper performance of the Mission, compliance with agreed deadlines, the integrity of the parcel during transport, and maintaining valid professional liability insurance where applicable.

6.3 Vendor's liability
The Vendor is responsible for the accuracy of the information provided (address, parcel description), the compliance of the parcel with applicable rules (no prohibited, dangerous, or illegal products), and their availability at the agreed time slot for pickup.


ARTICLE 7 — INSURANCE

Carriers are recommended to have professional liability insurance covering their delivery activity. HopDrop reserves the right to request proof of insurance at any time. HopDrop is not the insurer of transported parcels.


ARTICLE 8 — INTELLECTUAL PROPERTY

The HopDrop brand, logo, application design, and all Platform content are the exclusive property of HopDrop. Any unauthorized reproduction, representation, or use is prohibited. Registration on the Platform grants the User a personal, non-exclusive, and non-transferable license to use the application.


ARTICLE 9 — PERSONAL DATA

HopDrop collects and processes Users' personal data in accordance with the General Data Protection Regulation (GDPR) and the French Data Protection Act. Data processing details are described in the Privacy Policy accessible from the application.


ARTICLE 10 — TERMINATION

Any User may terminate their account at any time, without notice or compensation, by contacting support at support@hopdrop.fr. HopDrop may suspend or terminate a User's account in case of breach of these ToS, fraud or attempted fraud, behavior harmful to other Users, or prolonged inactivity. Termination results in the deletion of the account and associated data under the conditions set out in the Privacy Policy.


ARTICLE 11 — AMENDMENT OF THE TOS

HopDrop reserves the right to amend these ToS at any time. Users will be notified of any amendment by notification in the application at least 15 days before the amendment takes effect. Continued use of the Platform after the amendment takes effect constitutes acceptance of the new ToS.


ARTICLE 12 — APPLICABLE LAW AND DISPUTES

These ToS are governed by French law. In the event of a dispute, the parties agree to seek an amicable resolution. In accordance with Articles L.611-1 et seq. of the French Consumer Code, any consumer may use a consumer mediator free of charge to resolve a dispute amicably. Failing amicable resolution, the French courts shall have sole jurisdiction.`,

      es: `Última actualización: 7 de marzo de 2026

PREÁMBULO

La empresa HopDrop (en adelante "HopDrop") opera una plataforma digital accesible a través de una aplicación móvil que conecta a personas que desean enviar paquetes (en adelante "Vendedores") con prestadores de servicios de entrega independientes (en adelante "Repartidores").

HopDrop actúa exclusivamente como intermediario técnico y no es parte de ningún contrato de prestación de servicios de entrega celebrado entre los Usuarios.

Las presentes Condiciones Generales de Uso (en adelante "CGU") rigen el acceso y uso de la Plataforma por parte de cualquier Usuario.


ARTÍCULO 1 — DEFINICIONES

"Plataforma": La aplicación móvil HopDrop y todos los servicios digitales asociados, operados por HopDrop como intermediario técnico.

"Usuario": Toda persona física o jurídica registrada en la Plataforma, ya sea como Vendedor o Repartidor.

"Vendedor": Persona física o jurídica que utiliza la Plataforma para hacer entregar un paquete por un Repartidor independiente.

"Repartidor": Prestador de servicios independiente registrado en la Plataforma, con un estatus de autónomo válido, que ofrece sus servicios de entrega a los Vendedores.

"Misión": Prestación de entrega realizada por un Repartidor por cuenta de un Vendedor, que incluye la recogida del paquete, su transporte y su depósito en el punto de destino acordado.

"Comisión": Remuneración percibida por HopDrop a cambio de su servicio de intermediación, fijada en 1€ por Misión.


ARTÍCULO 2 — OBJETO

Las presentes CGU tienen por objeto definir las condiciones de acceso y uso de la Plataforma. HopDrop proporciona un servicio de intermediación técnica que permite la conexión de Vendedores con Repartidores independientes, la facilitación de contratos de prestación entre ambos, y la gestión segura de los flujos financieros relacionados con las Misiones.

HopDrop no es un proveedor de servicios de entrega ni empleador de los Repartidores.


ARTÍCULO 3 — REGISTRO Y CONDICIONES DE ACCESO

El registro está abierto a cualquier persona física mayor de 18 años o persona jurídica debidamente constituida. Los Repartidores deben además disponer de un estatus de autónomo válido y proporcionar los documentos justificativos requeridos.


ARTÍCULO 4 — FUNCIONAMIENTO DEL SERVICIO

El Vendedor crea una solicitud de recogida. El Repartidor acepta voluntariamente las Misiones disponibles. La Misión comprende la recogida, verificación del embalaje, transporte y depósito del paquete. El destinatario dispone de 12 horas para confirmar la recepción.


ARTÍCULO 5 — PRECIOS Y PAGO

El precio de una Misión es de 10€ IVA incluido (9€ para el Repartidor, 1€ de comisión HopDrop). El pago se realiza a través de Stripe. Los fondos se retienen hasta la confirmación de la entrega.


ARTÍCULO 6 — RESPONSABILIDADES

HopDrop garantiza el funcionamiento técnico de la Plataforma pero no es responsable de la calidad de la entrega, los daños a los paquetes ni el comportamiento de los Usuarios.


ARTÍCULOS 7-12 — SEGURO, PROPIEDAD INTELECTUAL, DATOS PERSONALES, RESOLUCIÓN, MODIFICACIONES, LEGISLACIÓN APLICABLE

Se recomienda a los Repartidores contar con seguro de responsabilidad civil profesional. La marca HopDrop es propiedad exclusiva de HopDrop. Los datos personales se tratan conforme al RGPD. Cualquier Usuario puede cancelar su cuenta contactando a support@hopdrop.fr. Las CGU se rigen por la legislación francesa.`,

      ar: `آخر تحديث: 7 مارس 2026

مقدمة

تدير شركة HopDrop (المشار إليها فيما بعد بـ "HopDrop") منصة رقمية متاحة عبر تطبيق جوال تتيح الربط بين الأشخاص الراغبين في إرسال طرود (المشار إليهم بـ "البائعين") ومقدمي خدمات التوصيل المستقلين (المشار إليهم بـ "الناقلين").

تعمل HopDrop حصرياً كوسيط تقني ولا تكون طرفاً في أي عقد خدمة توصيل مبرم بين المستخدمين.

تحكم شروط الاستخدام العامة هذه الوصول إلى المنصة واستخدامها من قبل جميع المستخدمين.


المادة 1 — التعريفات

"المنصة": تطبيق HopDrop للهاتف المحمول وجميع الخدمات الرقمية المرتبطة به.
"المستخدم": أي شخص طبيعي أو اعتباري مسجل في المنصة.
"البائع": شخص يستخدم المنصة لتوصيل طرد عبر ناقل مستقل.
"الناقل": مقدم خدمة مستقل مسجل في المنصة يقدم خدمات التوصيل.
"المهمة": خدمة التوصيل التي يقوم بها الناقل لحساب البائع.
"العمولة": مكافأة HopDrop مقابل خدمة الوساطة، محددة بـ 1€ لكل مهمة.


المادة 2 — الغرض

تحدد هذه الشروط أحكام الوصول إلى المنصة واستخدامها. تقدم HopDrop خدمة وساطة تقنية تتيح الربط بين البائعين والناقلين المستقلين وإدارة التدفقات المالية المتعلقة بالمهام.


المادة 3 — التسجيل وشروط الوصول

التسجيل مفتوح لأي شخص طبيعي يبلغ من العمر 18 عاماً أو أكثر. يجب على الناقلين توفير وضع مستقل صالح والوثائق المطلوبة.


المواد 4-12

تشمل المهمة استلام الطرد ونقله وتسليمه. سعر المهمة 10€ شاملة الضرائب (9€ للناقل، 1€ عمولة). يتم الدفع عبر Stripe. تضمن HopDrop التشغيل التقني للمنصة. تخضع هذه الشروط للقانون الفرنسي.`,

      pt: `Última atualização: 7 de março de 2026

PREÂMBULO

A empresa HopDrop (doravante "HopDrop") opera uma plataforma digital acessível por meio de um aplicativo móvel que conecta pessoas que desejam enviar encomendas (doravante "Vendedores") com prestadores de serviços de entrega independentes (doravante "Entregadores").

A HopDrop atua exclusivamente como intermediária técnica e não é parte de nenhum contrato de prestação de serviços de entrega celebrado entre os Usuários.

Estes Termos de Uso (doravante "TU") regem o acesso e o uso da Plataforma por qualquer Usuário.


ARTIGO 1 — DEFINIÇÕES

"Plataforma": O aplicativo móvel HopDrop e todos os serviços digitais associados.
"Usuário": Qualquer pessoa física ou jurídica registrada na Plataforma.
"Vendedor": Pessoa que utiliza a Plataforma para ter uma encomenda entregue por um Entregador independente.
"Entregador": Prestador de serviços independente registrado na Plataforma.
"Missão": Serviço de entrega realizado por um Entregador em nome de um Vendedor.
"Comissão": Remuneração recebida pela HopDrop pelo serviço de intermediação, fixada em 1€ por Missão.


ARTIGO 2 — OBJETO

Estes TU definem as condições de acesso e uso da Plataforma. A HopDrop fornece um serviço de intermediação técnica que permite conectar Vendedores com Entregadores independentes e gerenciar os fluxos financeiros relacionados às Missões.


ARTIGO 3 — REGISTRO E CONDIÇÕES DE ACESSO

O registro é aberto a qualquer pessoa física com 18 anos ou mais. Os Entregadores devem possuir status de trabalhador autônomo válido e fornecer os documentos necessários.


ARTIGOS 4-12

A Missão inclui a coleta, transporte e entrega da encomenda. O preço é de 10€ com impostos incluídos (9€ para o Entregador, 1€ de comissão). O pagamento é processado via Stripe. A HopDrop garante o funcionamento técnico da Plataforma. Estes TU são regidos pela legislação francesa. Qualquer Usuário pode encerrar sua conta contactando support@hopdrop.fr.`,
    },
  },

  cgv: {
    title: {
      fr: 'Conditions Générales de Vente',
      en: 'Terms of Sale',
      es: 'Condiciones Generales de Venta',
      ar: 'شروط البيع العامة',
      pt: 'Termos de Venda',
    },
    content: {
      fr: `Dernière mise à jour : 7 mars 2026

PRÉAMBULE

Les présentes Conditions Générales de Vente (ci-après « CGV ») s'appliquent à toute utilisation du service d'intermédiation proposé par HopDrop aux Vendeurs. Elles complètent les Conditions Générales d'Utilisation (CGU) de la Plateforme.


ARTICLE 1 — CHAMP D'APPLICATION

Les présentes CGV régissent la relation entre HopDrop et les Vendeurs utilisant la Plateforme pour trouver un Livreur indépendant. Toute création de demande de prise en charge implique l'acceptation pleine et entière des présentes CGV.


ARTICLE 2 — SERVICE PROPOSÉ

HopDrop propose un service d'intermédiation permettant aux Vendeurs de trouver des Livreurs indépendants pour la livraison de leurs colis. HopDrop n'exécute pas elle-même la prestation de livraison et n'en est pas partie. Le contrat de prestation de livraison est conclu directement entre le Vendeur et le Livreur qui accepte la Mission.


ARTICLE 3 — COMMANDE ET PAIEMENT

3.1 Processus de commande
Le Vendeur crée une demande de prise en charge en renseignant les informations requises (description du colis, adresse de récupération, créneau horaire, point de dépôt). La demande de prise en charge est publiée et rendue visible aux Livreurs disponibles à proximité.

3.2 Paiement sécurisé
Le paiement de 10€ est effectué par le Vendeur au moment de la confirmation de sa demande, via la solution de paiement sécurisée Stripe. Les fonds sont séquestrés jusqu'à la confirmation de la livraison. En cas d'annulation avant acceptation par un Livreur, le Vendeur est intégralement remboursé.

3.3 Confirmation
Le Vendeur reçoit une confirmation de sa demande de prise en charge. Il est informé lorsqu'un Livreur accepte sa Mission et peut suivre l'avancement de la livraison en temps réel.


ARTICLE 4 — PRIX

Le prix d'une Mission est fixé à 10€ TTC et comprend :
— La rémunération du Livreur indépendant : 9€ ;
— La commission d'intermédiation HopDrop : 1€.

Ce prix est identique quelle que soit la taille du colis, dans la limite des tailles acceptées par la Plateforme.


ARTICLE 5 — DROIT DE RÉTRACTATION

Conformément aux articles L.221-18 et suivants du Code de la consommation, le Vendeur consommateur dispose d'un droit de rétractation de 14 jours à compter de la confirmation de sa commande, sous réserve que la Mission n'ait pas été acceptée par un Livreur. Si le Vendeur a expressément demandé l'exécution immédiate du service et qu'un Livreur a accepté la Mission, le droit de rétractation ne pourra plus être exercé conformément à l'article L.221-28 du Code de la consommation.

Pour exercer son droit de rétractation, le Vendeur peut annuler sa demande directement depuis l'application ou contacter le support à l'adresse support@hopdrop.fr.


ARTICLE 6 — GARANTIES

HopDrop garantit la vérification préalable des documents des Livreurs inscrits sur la Plateforme et met à disposition un système d'évaluation permettant aux Vendeurs de noter les Livreurs après chaque Mission. HopDrop ne garantit toutefois aucun résultat quant à la prestation de livraison, celle-ci étant réalisée par des prestataires indépendants sous leur propre responsabilité.


ARTICLE 7 — RÉCLAMATIONS ET LITIGES

Toute réclamation relative à une Mission doit être adressée en priorité au support HopDrop à l'adresse support@hopdrop.fr dans un délai de 48 heures suivant la livraison. HopDrop s'engage à examiner chaque réclamation et à proposer une solution dans un délai raisonnable.

Conformément aux articles L.611-1 et suivants du Code de la consommation, tout Vendeur consommateur peut recourir gratuitement à un médiateur de la consommation. À défaut, les tribunaux français seront compétents.`,

      en: `Last updated: March 7, 2026

PREAMBLE

These Terms of Sale (hereinafter "ToSa") apply to all use of the intermediation service offered by HopDrop to Vendors. They supplement the Terms of Service (ToS) of the Platform.


ARTICLE 1 — SCOPE

These ToSa govern the relationship between HopDrop and Vendors using the Platform to find an independent Carrier. Any creation of a pickup request implies full and complete acceptance of these ToSa.


ARTICLE 2 — SERVICE PROVIDED

HopDrop offers an intermediation service allowing Vendors to find independent Carriers for the delivery of their parcels. HopDrop does not perform the delivery service itself. The delivery service contract is concluded directly between the Vendor and the Carrier who accepts the Mission.


ARTICLE 3 — ORDER AND PAYMENT

3.1 Order process
The Vendor creates a pickup request by providing the required information (parcel description, pickup address, time slot, drop-off point).

3.2 Secure payment
The \u20AC10 payment is made by the Vendor at the time of request confirmation via Stripe. Funds are held in escrow until delivery confirmation. In case of cancellation before acceptance by a Carrier, the Vendor is fully refunded.

3.3 Confirmation
The Vendor receives confirmation of their pickup request and is notified when a Carrier accepts their Mission.


ARTICLE 4 — PRICE

The price of a Mission is \u20AC10 including all taxes (\u20AC9 Carrier remuneration + \u20AC1 HopDrop commission). This price is the same regardless of parcel size.


ARTICLE 5 — RIGHT OF WITHDRAWAL

In accordance with French Consumer Code, consumers have a 14-day right of withdrawal from order confirmation, provided the Mission has not been accepted by a Carrier. Once accepted, the right of withdrawal can no longer be exercised.


ARTICLE 6 — GUARANTEES

HopDrop guarantees prior verification of Carrier documents and provides a rating system. HopDrop does not guarantee any results regarding the delivery service.


ARTICLE 7 — COMPLAINTS AND DISPUTES

Any complaint must be sent to support@hopdrop.fr within 48 hours of delivery. In accordance with French Consumer Code, consumers may use a consumer mediator free of charge.`,

      es: `Última actualización: 7 de marzo de 2026

PREÁMBULO

Las presentes Condiciones Generales de Venta (en adelante "CGV") se aplican a todo uso del servicio de intermediación ofrecido por HopDrop a los Vendedores. Complementan las Condiciones Generales de Uso (CGU) de la Plataforma.

Las CGV rigen la relación entre HopDrop y los Vendedores. El precio de una Misión es de 10€ IVA incluido (9€ remuneración del Repartidor, 1€ comisión HopDrop). El pago se realiza a través de Stripe. El consumidor tiene derecho de desistimiento de 14 días. Las reclamaciones deben dirigirse a support@hopdrop.fr en un plazo de 48 horas.`,

      ar: `آخر تحديث: 7 مارس 2026

مقدمة

تنطبق شروط البيع العامة هذه على جميع استخدامات خدمة الوساطة المقدمة من HopDrop للبائعين. وهي تكمّل شروط الاستخدام العامة للمنصة.

سعر المهمة 10€ شاملة الضرائب (9€ أجر الناقل، 1€ عمولة HopDrop). يتم الدفع عبر Stripe. للمستهلك حق الانسحاب خلال 14 يوماً. يجب إرسال الشكاوى إلى support@hopdrop.fr خلال 48 ساعة.`,

      pt: `Última atualização: 7 de março de 2026

PREÂMBULO

Os presentes Termos de Venda aplicam-se a todo uso do serviço de intermediação oferecido pela HopDrop aos Vendedores. Complementam os Termos de Uso da Plataforma.

O preço de uma Missão é de 10€ com impostos incluídos (9€ remuneração do Entregador, 1€ comissão HopDrop). O pagamento é realizado via Stripe. O consumidor tem direito de arrependimento de 14 dias. As reclamações devem ser enviadas para support@hopdrop.fr em até 48 horas.`,
    },
  },

  mentions: {
    title: {
      fr: 'Mentions Légales',
      en: 'Legal Notices',
      es: 'Aviso Legal',
      ar: 'الإشعارات القانونية',
      pt: 'Avisos Legais',
    },
    content: {
      fr: `Dernière mise à jour : 7 mars 2026

1. ÉDITEUR DE L'APPLICATION

L'application mobile HopDrop est éditée par :
Raison sociale : Naida Saindou (EI)
Forme juridique : Entrepreneur individuel (micro-entreprise)
Capital social : Non applicable
Siège social : 8 rue Robert Doisneau, 35690 Acigné, France
Numéro SIRET : 994 863 231 00019
Code APE : 7022Z
Numéro RCS : Non applicable (activité libérale)
Numéro de TVA intracommunautaire : Non applicable (franchise en base de TVA)
Date d'immatriculation : 08 décembre 2025
Directeur de la publication : Naida Saindou
Contact : support@hopdrop.fr


2. HÉBERGEMENT

L'application et ses données sont hébergées par :
Backend : Railway Corporation — 548 Market St, San Francisco, CA 94104, USA — https://railway.app
Base de données : PostgreSQL hébergé par Railway
Stockage des images : Cloudinary Ltd — 111 W Evelyn Ave, Sunnyvale, CA 94086, USA — https://cloudinary.com
Paiements : Stripe Payments Europe, Ltd — 1 Grand Canal Street Lower, Dublin 2, Irlande — https://stripe.com


3. ACTIVITÉ

HopDrop est une plateforme d'intermédiation technique mettant en relation des Vendeurs souhaitant faire livrer des colis avec des Livreurs indépendants. HopDrop agit en qualité de mandataire pour la gestion des flux financiers et perçoit une commission d'intermédiation de 1€ par transaction.

HopDrop n'est pas prestataire de livraison et n'est pas employeur des Livreurs.


4. PROPRIÉTÉ INTELLECTUELLE

L'ensemble des éléments composant l'application HopDrop (textes, images, logo, marque, code source, design) sont la propriété exclusive de HopDrop et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.


5. DONNÉES PERSONNELLES

HopDrop collecte et traite des données personnelles dans le cadre de son activité, conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi n°78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés.

Pour toute question relative à vos données personnelles, vous pouvez nous contacter à l'adresse : support@hopdrop.fr.

Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition sur vos données. Pour exercer ces droits, contactez-nous à support@hopdrop.fr. En cas de différend, vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).

Consultez notre Politique de Confidentialité complète depuis les paramètres de l'application.


6. COOKIES

L'application mobile HopDrop n'utilise pas de cookies. Les données de session sont stockées localement sur l'appareil de l'Utilisateur de manière sécurisée.


7. MÉDIATION

Conformément aux articles L.611-1 et suivants du Code de la consommation, en cas de litige non résolu, le consommateur peut recourir à un médiateur de la consommation. Les coordonnées du médiateur seront communiquées sur demande à support@hopdrop.fr.


8. DROIT APPLICABLE

Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront compétents.`,

      en: `Last updated: March 7, 2026

1. APPLICATION PUBLISHER

The HopDrop mobile application is published by:
Company name: Naida Saindou (EI)
Legal form: Sole proprietor (micro-enterprise)
Share capital: Not applicable
Registered office: 8 rue Robert Doisneau, 35690 Acigné, France
SIRET number: 994 863 231 00019
APE code: 7022Z
RCS number: Not applicable (liberal profession)
Intra-community VAT number: Not applicable (VAT exemption)
Registration date: December 8, 2025
Publication director: Naida Saindou
Contact: support@hopdrop.fr


2. HOSTING

The application and its data are hosted by:
Backend: Railway Corporation — 548 Market St, San Francisco, CA 94104, USA — https://railway.app
Database: PostgreSQL hosted by Railway
Image storage: Cloudinary Ltd — 111 W Evelyn Ave, Sunnyvale, CA 94086, USA — https://cloudinary.com
Payments: Stripe Payments Europe, Ltd — 1 Grand Canal Street Lower, Dublin 2, Ireland — https://stripe.com


3. ACTIVITY

HopDrop is a technical intermediation platform connecting Vendors who wish to have parcels delivered with independent Carriers. HopDrop acts as agent for financial flow management and receives a \u20AC1 intermediation commission per transaction. HopDrop is not a delivery service provider and is not an employer of Carriers.


4. INTELLECTUAL PROPERTY

All elements of the HopDrop application (texts, images, logo, brand, source code, design) are the exclusive property of HopDrop and are protected by French and international intellectual property laws.


5. PERSONAL DATA

HopDrop collects and processes personal data in accordance with the GDPR and French data protection laws. Contact support@hopdrop.fr for any questions. You have the right of access, rectification, erasure, portability, restriction, and objection. In case of dispute, you may file a complaint with the CNIL (www.cnil.fr).


6. COOKIES

The HopDrop mobile application does not use cookies. Session data is stored locally on the User's device securely.


7. MEDIATION

In accordance with French Consumer Code, consumers may use a consumer mediator. Mediator contact details available upon request at support@hopdrop.fr.


8. APPLICABLE LAW

These legal notices are governed by French law. French courts shall have jurisdiction.`,

      es: `Última actualización: 7 de marzo de 2026

1. EDITOR DE LA APLICACIÓN

La aplicación móvil HopDrop es editada por:
Razón social: Naida Saindou (EI)
Forma jurídica: Empresario individual (microempresa)
Sede social: 8 rue Robert Doisneau, 35690 Acigné, Francia
SIRET: 994 863 231 00019
Contacto: support@hopdrop.fr

2. ALOJAMIENTO

Backend: Railway Corporation — San Francisco, USA
Base de datos: PostgreSQL por Railway
Almacenamiento de imágenes: Cloudinary Ltd — Sunnyvale, USA
Pagos: Stripe Payments Europe, Ltd — Dublín, Irlanda

3-8. HopDrop es una plataforma de intermediación técnica. Todos los elementos de la aplicación son propiedad exclusiva de HopDrop. Los datos personales se tratan conforme al RGPD. La aplicación no utiliza cookies. Se rige por la legislación francesa.`,

      ar: `آخر تحديث: 7 مارس 2026

1. ناشر التطبيق

تطبيق HopDrop للهاتف المحمول منشور من قبل:
الاسم التجاري: Naida Saindou (EI)
الشكل القانوني: رائد أعمال فردي
المقر: 8 rue Robert Doisneau, 35690 Acigné, France
SIRET: 994 863 231 00019
الاتصال: support@hopdrop.fr

2. الاستضافة: Railway (الخادم)، Cloudinary (الصور)، Stripe (المدفوعات)

3-8. HopDrop منصة وساطة تقنية. جميع عناصر التطبيق ملكية حصرية لـ HopDrop. تتم معالجة البيانات الشخصية وفقاً للائحة العامة لحماية البيانات. لا يستخدم التطبيق ملفات تعريف الارتباط. يخضع للقانون الفرنسي.`,

      pt: `Última atualização: 7 de março de 2026

1. EDITOR DO APLICATIVO

O aplicativo móvel HopDrop é publicado por:
Razão social: Naida Saindou (EI)
Forma jurídica: Empreendedor individual (microempresa)
Sede: 8 rue Robert Doisneau, 35690 Acigné, França
SIRET: 994 863 231 00019
Contato: support@hopdrop.fr

2. HOSPEDAGEM: Railway (backend), Cloudinary (imagens), Stripe (pagamentos)

3-8. A HopDrop é uma plataforma de intermediação técnica. Todos os elementos do aplicativo são propriedade exclusiva da HopDrop. Os dados pessoais são tratados conforme o RGPD. O aplicativo não utiliza cookies. Rege-se pela legislação francesa.`,
    },
  },

  confidentialite: {
    title: {
      fr: 'Politique de Confidentialité',
      en: 'Privacy Policy',
      es: 'Política de Privacidad',
      ar: 'سياسة الخصوصية',
      pt: 'Política de Privacidade',
    },
    content: {
      fr: `Dernière mise à jour : 7 mars 2026

La présente Politique de Confidentialité décrit la manière dont HopDrop collecte, utilise et protège les données personnelles de ses Utilisateurs, conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés.


1. RESPONSABLE DE TRAITEMENT

Le responsable du traitement des données est :
Naida Saindou (EI), exerçant sous le nom commercial HopDrop
SIRET : 994 863 231 00019
Siège : 8 rue Robert Doisneau, 35690 Acigné, France
Contact : support@hopdrop.fr


2. DONNÉES COLLECTÉES

2.1 Données d'identification
Nom, prénom, adresse email, numéro de téléphone (optionnel), photo de profil (optionnelle).

2.2 Données de localisation
Adresses de récupération et de livraison, position GPS en temps réel (uniquement pendant les Missions actives, pour les Livreurs).

2.3 Données financières
Les paiements sont traités par Stripe. HopDrop ne stocke aucune donnée bancaire (numéro de carte, IBAN). Seuls les identifiants de transaction Stripe sont conservés.

2.4 Documents des Livreurs
Pièce d'identité (recto/verso), extrait Kbis ou justificatif SIRET, permis de conduire (si véhicule motorisé), carte grise (si véhicule). Ces documents sont stockés de manière sécurisée via Cloudinary et ne sont accessibles qu'aux administrateurs de HopDrop.

2.5 Données d'utilisation
Historique des Missions, évaluations, messages échangés entre Vendeurs et Livreurs.


3. FINALITÉS DU TRAITEMENT

Les données personnelles sont collectées et traitées pour les finalités suivantes :
— Création et gestion des comptes Utilisateurs ;
— Mise en relation entre Vendeurs et Livreurs ;
— Traitement et sécurisation des paiements ;
— Vérification de l'identité et des documents des Livreurs ;
— Suivi en temps réel des Missions (géolocalisation) ;
— Gestion du support client ;
— Amélioration de la Plateforme et de l'expérience Utilisateur ;
— Respect des obligations légales et réglementaires.


4. BASE LÉGALE DU TRAITEMENT

Les traitements de données reposent sur :
— L'exécution du contrat (CGU/CGV) liant l'Utilisateur à HopDrop ;
— Le respect des obligations légales (facturation, lutte contre la fraude) ;
— L'intérêt légitime de HopDrop (amélioration du service, sécurité) ;
— Le consentement de l'Utilisateur (notifications marketing, le cas échéant).


5. DESTINATAIRES DES DONNÉES

Les données personnelles peuvent être communiquées aux destinataires suivants :
— L'équipe interne de HopDrop (administration, support, vérification) ;
— Stripe (traitement des paiements) ;
— Cloudinary (stockage sécurisé des images et documents) ;
— Railway (hébergement technique) ;
— Les autorités compétentes, sur demande légale.

HopDrop ne vend ni ne loue les données personnelles de ses Utilisateurs à des tiers.


6. DURÉE DE CONSERVATION

— Comptes actifs : les données sont conservées pendant toute la durée de la relation contractuelle ;
— Comptes supprimés : les données sont supprimées dans un délai de 30 jours, à l'exception des données devant être conservées pour respecter les obligations légales (comptabilité, fiscalité) pendant 5 ans ;
— Documents des Livreurs : conservés pendant la durée d'inscription et 1 an après la suppression du compte ;
— Données de transaction : conservées 5 ans conformément aux obligations comptables.


7. DROITS DES UTILISATEURS

Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
— Droit d'accès : obtenir la confirmation que vos données sont traitées et en obtenir une copie ;
— Droit de rectification : demander la correction de données inexactes ;
— Droit d'effacement : demander la suppression de vos données ;
— Droit à la portabilité : recevoir vos données dans un format structuré ;
— Droit d'opposition : vous opposer au traitement de vos données ;
— Droit à la limitation : demander la limitation du traitement.

Pour exercer ces droits, contactez-nous à : support@hopdrop.fr. Nous répondrons dans un délai de 30 jours. En cas de différend persistant, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) — www.cnil.fr.


8. SÉCURITÉ DES DONNÉES

HopDrop met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données :
— Chiffrement des communications (HTTPS/TLS) ;
— Authentification par tokens JWT avec refresh automatique ;
— Stockage sécurisé des mots de passe (hachage bcrypt) ;
— Hébergement sur des infrastructures certifiées ;
— Accès restreint aux données par rôles ;
— Stockage sécurisé des documents sensibles.


9. TRANSFERTS INTERNATIONAUX

Certains sous-traitants de HopDrop (Stripe, Cloudinary, Railway) peuvent traiter des données en dehors de l'Union européenne. Ces transferts sont encadrés par des clauses contractuelles types approuvées par la Commission européenne ou par des décisions d'adéquation.


10. MODIFICATION DE LA POLITIQUE

HopDrop se réserve le droit de modifier la présente Politique de Confidentialité. Les Utilisateurs seront informés de toute modification substantielle par notification dans l'application.


11. CONTACT

Pour toute question relative à la présente Politique de Confidentialité ou à vos données personnelles :
Email : support@hopdrop.fr`,

      en: `Last updated: March 7, 2026

This Privacy Policy describes how HopDrop collects, uses, and protects the personal data of its Users, in accordance with the General Data Protection Regulation (GDPR — EU Regulation 2016/679) and the French Data Protection Act.


1. DATA CONTROLLER

The data controller is:
Naida Saindou (EI), operating under the trade name HopDrop
SIRET: 994 863 231 00019
Registered office: 8 rue Robert Doisneau, 35690 Acigné, France
Contact: support@hopdrop.fr


2. DATA COLLECTED

2.1 Identification data
Last name, first name, email address, phone number (optional), profile photo (optional).

2.2 Location data
Pickup and delivery addresses, real-time GPS position (only during active Missions, for Carriers).

2.3 Financial data
Payments are processed by Stripe. HopDrop does not store any banking data (card number, IBAN). Only Stripe transaction identifiers are retained.

2.4 Carrier documents
ID (front/back), Kbis extract or SIRET certificate, driving license (if motorized vehicle), vehicle registration (if vehicle). These documents are stored securely via Cloudinary and are only accessible to HopDrop administrators.

2.5 Usage data
Mission history, ratings, messages exchanged between Vendors and Carriers.


3. PURPOSE OF PROCESSING

Personal data is collected and processed for the following purposes:
— Creation and management of User accounts;
— Connecting Vendors and Carriers;
— Processing and securing payments;
— Verifying the identity and documents of Carriers;
— Real-time tracking of Missions (geolocation);
— Customer support management;
— Improving the Platform and User experience;
— Compliance with legal and regulatory obligations.


4. LEGAL BASIS

Data processing is based on: contract execution, legal obligations, legitimate interest of HopDrop, and User consent where applicable.


5. DATA RECIPIENTS

Personal data may be shared with: HopDrop internal team, Stripe, Cloudinary, Railway, and competent authorities upon legal request. HopDrop does not sell or rent Users' personal data to third parties.


6. DATA RETENTION

Active accounts: data retained during the contractual relationship. Deleted accounts: data deleted within 30 days, except data required by law (5 years). Carrier documents: retained during registration and 1 year after account deletion. Transaction data: retained 5 years per accounting obligations.


7. USER RIGHTS

Under the GDPR, you have the following rights: access, rectification, erasure, portability, objection, and restriction of processing. Contact support@hopdrop.fr to exercise these rights. You may file a complaint with the CNIL (www.cnil.fr).


8. DATA SECURITY

HopDrop implements HTTPS/TLS encryption, JWT authentication, bcrypt password hashing, certified hosting infrastructure, role-based data access, and secure document storage.


9. INTERNATIONAL TRANSFERS

Some HopDrop subcontractors may process data outside the EU. These transfers are governed by standard contractual clauses approved by the European Commission.


10. POLICY CHANGES

HopDrop reserves the right to modify this Privacy Policy. Users will be notified of any substantial changes by notification in the application.


11. CONTACT

For any questions: support@hopdrop.fr`,

      es: `Última actualización: 7 de marzo de 2026

Esta Política de Privacidad describe cómo HopDrop recopila, utiliza y protege los datos personales de sus Usuarios, de conformidad con el Reglamento General de Protección de Datos (RGPD).

Responsable del tratamiento: Naida Saindou (EI), SIRET: 994 863 231 00019, Contacto: support@hopdrop.fr

Datos recopilados: datos de identificación, ubicación, financieros (procesados por Stripe), documentos de los Repartidores y datos de uso.

Finalidades: gestión de cuentas, conexión de Vendedores y Repartidores, procesamiento de pagos, verificación de identidad, seguimiento en tiempo real, soporte al cliente y cumplimiento legal.

Derechos del usuario: acceso, rectificación, supresión, portabilidad, oposición y limitación del tratamiento. Contactar a support@hopdrop.fr.

Seguridad: cifrado HTTPS/TLS, autenticación JWT, hash bcrypt, infraestructura certificada.

Transferencias internacionales: reguladas por cláusulas contractuales tipo aprobadas por la Comisión Europea.`,

      ar: `آخر تحديث: 7 مارس 2026

تصف سياسة الخصوصية هذه كيفية جمع HopDrop واستخدام وحماية البيانات الشخصية لمستخدميها، وفقاً للائحة العامة لحماية البيانات (GDPR).

المسؤول عن المعالجة: Naida Saindou (EI)، SIRET: 994 863 231 00019، الاتصال: support@hopdrop.fr

البيانات المجمعة: بيانات التعريف، الموقع، البيانات المالية (تتم معالجتها عبر Stripe)، وثائق الناقلين وبيانات الاستخدام.

الأغراض: إدارة الحسابات، ربط البائعين والناقلين، معالجة المدفوعات، التحقق من الهوية، التتبع في الوقت الفعلي، دعم العملاء والامتثال القانوني.

حقوق المستخدم: الوصول، التصحيح، المحو، قابلية النقل، الاعتراض وتقييد المعالجة. اتصل بـ support@hopdrop.fr.

الأمان: تشفير HTTPS/TLS، مصادقة JWT، تجزئة bcrypt، بنية تحتية معتمدة.`,

      pt: `Última atualização: 7 de março de 2026

Esta Política de Privacidade descreve como a HopDrop coleta, utiliza e protege os dados pessoais de seus Usuários, em conformidade com o Regulamento Geral de Proteção de Dados (RGPD).

Responsável pelo tratamento: Naida Saindou (EI), SIRET: 994 863 231 00019, Contato: support@hopdrop.fr

Dados coletados: dados de identificação, localização, financeiros (processados pelo Stripe), documentos dos Entregadores e dados de uso.

Finalidades: gestão de contas, conexão de Vendedores e Entregadores, processamento de pagamentos, verificação de identidade, rastreamento em tempo real, suporte ao cliente e conformidade legal.

Direitos do usuário: acesso, retificação, exclusão, portabilidade, oposição e limitação do tratamento. Contate support@hopdrop.fr.

Segurança: criptografia HTTPS/TLS, autenticação JWT, hash bcrypt, infraestrutura certificada.

Transferências internacionais: reguladas por cláusulas contratuais padrão aprovadas pela Comissão Europeia.`,
    },
  },
};
