# -*- coding: utf-8 -*-
# Source des 14 épisodes « Les petites choses », intégrés par défaut dans index.html.
# Usage : python3 tools/generer-contenu.py            → met à jour le bloc CONTENU_INTEGRE de index.html
#         python3 tools/generer-contenu.py sortie.json → écrit aussi le paquet seul (installable à la main)
# Incrémente "version" à chaque modification des textes : la progression (épisodes lus, objets) est gardée.
import json, re, sys

def N(t): return {"t": "narr", "text": t}
def L(t): return {"t": "say", "who": "leo", "text": t}
def E(t): return {"t": "say", "who": "leonore", "text": t}
def P(who, t): return {"t": "say", "who": who, "text": t}
def TX(who, t): return {"t": "sms", "who": who, "text": t}
def SC(cast, title=None, home="here", room=0):
    d = {"t": "scene", "home": home, "cast": cast, "room": room}
    if title: d["title"] = title
    return d
def CH(prompt, opts, key=None, keep=None, who=None):
    d = {"t": "choice", "prompt": prompt, "options": [dict(label=o[0], value=o[1], then=o[2]) for o in opts]}
    if key: d["key"] = key
    if keep: d["keep"] = keep
    if who is not None: d["who"] = who
    return d
def ITEM(i, t=None):
    d = {"t": "item", "id": i}
    if t: d["text"] = t
    return d
def MEM(icon, key=None):
    d = {"t": "memory", "icon": icon}
    if key: d["key"] = key
    return d
def STAGE(early, later): return {"t": "stage", "early": early, "later": later}

EP = []
def ep(id, title, icon, teaser, hook, steps, memory, **kw):
    e = dict(id=id, title=title, icon=icon, teaser=teaser, hook=hook, steps=steps, memory=memory); e.update(kw); EP.append(e)

# 1 ─────────────────────────────────────────────────────────────
ep("voisine", "La « voisine »", "🚪", "1 à 2 minutes",
  hook=[STAGE(
    [TX("constance", "dis. tu te souviens de la fois où j’ai été ta voisine ?")],
    [N("En rangeant {home}, une vieille photo de la coloc glisse d’un carton. La porte du Kremlin-Bicêtre, un soir de janvier."),
     TX("constance", "je viens de tomber sur la même. tu te souviens de la fois où j’ai été ta voisine ?")])],
  steps=[
    N("Tout ce qui suit est vraiment arrivé. Les répliques, Léo les a réécrites de mémoire : il n’avait pas de micro."),
    SC(["leonore", "constance"], "INT. LE KREMLIN-BICÊTRE — 5 JANVIER 2026", home="coloc"),
    N("5 janvier 2026. Premier rendez-vous. Léonore attend chez elle. Constance est là, une de ses meilleures potes de la fac. Le plan, c’est qu’elle soit partie avant qu’il arrive."),
    N("Il arrive en avance."),
    SC(["leonore", "constance", "leo"], "INT. LE KREMLIN-BICÊTRE — LA PORTE", home="coloc"),
    N("La porte s’ouvre sur trois personnes qui n’avaient pas prévu d’être trois. Léonore, prise de court, présente Constance."),
    CH("Tu la présentes comment ?", [
      ("« C’est… ma voisine. »", "voisine", [N("« Ma voisine. » Constance hoche la tête avec le sérieux d’une voisine. Elle a ses chaussons. Elle a son sac de cours. Elle a une carte d’étudiante de la même fac, qui dépasse de sa poche.")]),
      ("Ma voisine, avec beaucoup d’aplomb", "aplomb", [N("Elle le dit avec un aplomb parfait. « Ma voisine. » Constance enchaîne sur le temps qu’il fait dans l’immeuble. L’immeuble n’a pas de temps particulier.")]),
      ("Ma voisine… et regarder ailleurs", "ailleurs", [N("« Ma voisine. » Elle regarde le plafond en le disant. Le plafond n’y est pour rien. Constance, elle, regarde Léo, très fort.")])
    ], key="presentation"),
    P("constance", "Bon. Je vais… retourner chez moi. À côté. Juste à côté."),
    N("Elle s’en va. Pas à côté. Le stress redescend d’un coup, comme une casserole qu’on retire du feu."),
    L("Ta voisine a l’air très sympa."),
    N("Elle rit. Il rit. Au bout de dix minutes, ils se parlent comme s’ils se connaissaient depuis toujours. Ça ne s’arrêtera plus vraiment."),
    TX("constance", "« voisine ». je l’encadre. je te l’offre au mariage"),
    MEM("🚪"),
  ],
  memory={"icon": "🚪", "title": "La « voisine »", "text": "5 janvier 2026, Le Kremlin-Bicêtre. Il arrive en avance, Constance est encore là, et Léonore la présente comme sa voisine. Une meilleure pote de la fac, en chaussons, dans le rôle de la voisine. Dix minutes plus tard, ils se parlaient comme s’ils se connaissaient depuis toujours."},
  ask="Tu ouvres la porte ?")

# 2 ─────────────────────────────────────────────────────────────
ep("pinte", "Une pinte à 15 h", "🍺", "1 à 2 minutes",
  hook=[STAGE(
    [TX("leo", "question sérieuse. il est quelle heure là ? … ok. c’est l’heure parfaite pour une bière. je dis ça, je dis rien")],
    [N("Sur une étagère de {home}, un sous-bock un peu gondolé. Personne n’a jamais osé le jeter."), TX("leo", "tu sais pourquoi on l’a gardé, ce sous-bock ?")])],
  steps=[
    SC(["leonore", "leo"], "EXT. PLACE DE LA CONTRESCARPE — 15 H"),
    N("Toujours ce premier rendez-vous. Ils vont place de la Contrescarpe boire une pinte. À 15 h. Pour rigoler, parce que c’est une heure ridicule pour une pinte."),
    CH("Tu prends quoi ?", [
      ("La même que lui, pour voir", "meme", [N("Deux pintes identiques. Il fait semblant de s’y connaître. Elle fait semblant de le croire.")]),
      ("La plus improbable de la carte", "improbable", [N("Elle choisit la plus improbable de la carte. Il regarde son verre, puis le sien, et regrette immédiatement d’avoir été raisonnable.")]),
      ("Une demi, finalement", "demi", [N("Elle commande une demi. Il a déjà dit « pinte ». Il assume. Il assume mal.")])
    ], key="pinte"),
    N("Ils parlent de tout. Elle rit d’un truc qu’il a dit, il ne sait même plus lequel."),
    N("C’est là, sur une terrasse à 15 h, une pinte trop grande dans la main, qu’il se dit pour la première fois : elle me plaît vraiment."),
    N("Il ne le dit pas, évidemment. Il dit un truc sur le temps."),
    N("Et le temps, justement, change d’avis. La neige commence à tomber. Puis très fort. La place devient blanche en dix minutes."),
    L("C’est moi qui ai commandé la neige. Pour l’ambiance."),
    ITEM("sousbock", "Elle glisse le sous-bock dans sa poche. Il rejoint ton inventaire : à poser où tu veux, avec 🎨 Décorer."),
    MEM("🍺"),
  ],
  memory={"icon": "🍺", "title": "Une pinte à 15 h", "text": "Place de la Contrescarpe, une pinte à 15 h pour rigoler. C’est là qu’il s’est dit pour la première fois qu’elle lui plaisait vraiment. Puis la neige est tombée, très fort."})

# 3 ─────────────────────────────────────────────────────────────
ep("cuvette", "La cuvette", "❄️", "2 minutes",
  hook=[STAGE(
    [TX("leo", "il neige un peu ce matin. j’ai mis mes chaussures qui accrochent. je dis ça pour qu’on soit tous rassurés")],
    [N("Une boule à neige sur l’étagère de {home}. Quelqu’un l’a secouée. Il neige dedans, beaucoup.")])],
  steps=[
    SC(["leonore", "leo"], "EXT. PARIS SOUS LA NEIGE — LE MÊME SOIR"),
    N("Léonore le regarde marcher sur la neige. Il marche comme quelqu’un qui découvre qu’il a des pieds."),
    L("Je gère. Je gère totalement."),
    N("Il ne gère pas. Il tient debout par principe."),
    {"t": "tap", "prompt": "Touche pour lui lancer une boule de neige (ou passe)", "count": 4, "emoji": "❄️", "done": "Trois boules sur quatre dans le manteau. La quatrième, il l’a prise en pleine figure. Il dit qu’il l’a laissée passer."},
    SC(["leonore", "leo"], "EXT. LA ROUTE DU RETOUR — EN VOITURE"),
    N("Sur le retour, en voiture, la route est blanche. La voiture dérape. Ils frôlent les barrières. Personne ne parle. Puis la voiture s’arrête toute seule, coincée dans un creux de la route. Une cuvette."),
    N("Ils sont sains et saufs. D’autres voitures sont coincées aussi."),
    CH("Qu’est-ce qui te revient en premier ?", [
      ("Le silence juste après", "silence", [N("Le silence juste après. Deux secondes où personne ne respire. Puis ils se regardent, et ils comprennent que tout va bien.")]),
      ("Sortir aider les autres", "aider", [N("Ils sortent aider les gens. Pousser, guider, rassurer. Léo glisse deux fois. Il aide quand même.")]),
      ("La bataille de boules de neige", "bataille", [N("Ils sortent aider les gens, et ça finit en bataille de boules de neige, au milieu de la route, avec des inconnus. Personne n’a gagné. Tout le monde a gagné.")])
    ], key="cuvette"),
    N("Ils aident les gens. Ils font une bataille de boules de neige. Il fait nuit, il fait froid, et c’est un des meilleurs moments de la journée."),
    ITEM("bouleNeige", "Une boule à neige rejoint ton inventaire. Secoue-la quand tu veux."),
    MEM("❄️"),
  ],
  memory={"icon": "❄️", "title": "La cuvette", "text": "Lui qui tient à peine debout sur la neige. La voiture qui dérape, les barrières frôlées, et le creux de la route où ils finissent coincés. Puis ils sortent aider les gens, et ça finit en bataille de boules de neige."})

# 4 ─────────────────────────────────────────────────────────────
ep("canape", "Le canapé a servi d’alibi", "🛋️", "1 minute",
  hook=[STAGE(
    [TX("leo", "petite question technique. ton canapé, il est confortable ? c’est pour une étude")],
    [N("Le canapé de {home}. Un plaid dessus. Il a l’air innocent. Il ne l’est pas.")])],
  steps=[
    SC(["leonore", "leo"], "INT. LE KREMLIN-BICÊTRE — PLUS TARD, CE SOIR-LÀ", home="coloc"),
    N("Ils rentrent sains et saufs. Dehors, il neige encore."),
    L("Avec la neige… je peux dormir sur ton canapé ? Le canapé, hein. Très bien, le canapé."),
    CH("Tu réponds :", [
      ("« Le canapé. Bien sûr. »", "canape", [N("« Le canapé. Bien sûr. » Elle sort un plaid. Ils le regardent tous les deux, ce plaid, comme on regarde un alibi.")]),
      ("Hausser un sourcil", "sourcil", [N("Elle hausse un sourcil. Il répète « le canapé » avec beaucoup de conviction. La conviction ne tient pas jusqu’à minuit.")]),
      ("« Il est très inconfortable, ce canapé. »", "inconfortable", [N("« Il est très inconfortable, ce canapé. » Il ne vérifie même pas.")])
    ], key="canape"),
    N("Le canapé a servi d’alibi. Ils finissent par dormir dans le même lit. La suite ne regarde qu’eux."),
    SC(["leo", "vincent"], "INT. RUE DES ARDENNES — LE LENDEMAIN", home="ardennes"),
    N("Ce que Léonore n’a su qu’après : le lendemain, une fois rentré, Léo appelle Vincent."),
    L("Vincent. Le rendez-vous était magique. Je crois que c’est le début de quelque chose."),
    P("vincent", "Tu me dis ça d’un film, d’habitude."),
    MEM("🛋️"),
  ],
  memory={"icon": "🛋️", "title": "Le canapé a servi d’alibi", "text": "« Je peux dormir sur ton canapé, à cause de la neige ? » Le canapé n’a pas servi. Le lendemain, Léo a appelé Vincent pour lui dire que c’était magique, et que c’était le début de quelque chose."})

# 5 ─────────────────────────────────────────────────────────────
ep("lappe", "Mauvais arrêt, bon baiser", "🎶", "2 minutes",
  hook=[STAGE(
    [TX("leo", "jeu. tu te souviens de quel arrêt de métro il fallait descendre, la deuxième fois ? moi non plus. c’était tout le problème")],
    [N("Un ticket de métro tombe d’une vieille veste, dans {home}. Il a une histoire. Plusieurs arrêts, même.")])],
  steps=[
    SC(["leonore", "leo"], "INT. UN BAR DE MONTMARTRE — DEUXIÈME RENDEZ-VOUS"),
    N("Deuxième rendez-vous. Un bar de Montmartre, des musiciens qui jouent, deux petits cocktails."),
    N("Le plan, ensuite : rue de Lappe, pour danser et profiter des offres."),
    SC(["leonore", "leo"], "INT. LE MÉTRO"),
    N("Ils se trompent d’arrêt."),
    L("C’était fait exprès. Pour la balade."),
    N("Ce n’était pas fait exprès."),
    SC(["leonore", "leo"], "EXT. QUELQUE PART VERS LA RUE DE LAPPE"),
    N("Ils finissent par trouver. Ils essaient plusieurs bars. Ils dansent ensemble."),
    N("Léo est très timide. Ça se voit. Il danse comme quelqu’un qui réfléchit à danser. Il réfléchit à autre chose, en fait. Longtemps."),
    N("Et puis il se lance. Premier baiser, au milieu du bar dansant."),
    CH("De cette soirée, tu retiens quoi ?", [
      ("Les musiciens de Montmartre", "musique", [N("Les musiciens. La première chanson, celle qui jouait quand ils se sont assis. Elle ne sait plus le titre. Elle sait l’air.")]),
      ("Le mauvais arrêt", "arret", [N("Le mauvais arrêt. Marcher à côté de lui sans savoir où on va, et trouver que c’est très bien comme ça.")]),
      ("Le moment où il s’est lancé", "lance", [N("Le moment où il s’est lancé. Elle l’a vu hésiter longtemps. Elle a attendu. Elle avait raison d’attendre.")]),
      ("Tout. Dans le désordre.", "tout", [N("Tout. Les cocktails, le métro, les bars, la danse. Dans le désordre, comme la soirée.")])
    ], key="soiree"),
    ITEM("ticket", "Le ticket du mauvais arrêt, encadré. Il rejoint ton inventaire."),
    MEM("🎶"),
  ],
  memory={"icon": "🎶", "title": "Mauvais arrêt, bon baiser", "text": "Des musiciens dans un bar de Montmartre, deux petits cocktails, puis la rue de Lappe pour danser. Un mauvais arrêt de métro, plusieurs bars, et lui, très timide, qui finit par se lancer : premier baiser, dans le bar dansant."})

# 6 ─────────────────────────────────────────────────────────────
ep("avance", "Elle avait deux semaines d’avance", "📅", "1 minute",
  hook=[STAGE(
    [TX("leo", "j’ai retrouvé un vieux plan dans mes notes. il était bien, mon plan. il était juste un peu lent")],
    [N("Un calendrier de 2026, dans un carton de {home}. Deux dates entourées. Une barrée.")])],
  steps=[
    SC(["leonore", "leo"], "INT. 2 FÉVRIER 2026"),
    N("Léo avait un plan. Un vrai, avec une date : la Saint-Valentin. Il comptait lui proposer qu’ils se mettent ensemble le 14 février."),
    N("Le 2 février 2026, c’est elle qui le lui propose."),
    N("Ce n’est pas rien, pour elle. Ce genre de phrase, on la tourne longtemps avant de la dire. Elle la dit quand même."),
    CH("Comment tu le lui dis ?", [
      ("Directement, en le regardant", "direct", [N("Elle le regarde et elle le dit, simplement. Il met deux secondes de trop à répondre. Ce sont deux secondes de bonheur, pas d’hésitation.")]),
      ("En faisant comme si de rien n’était", "lege", [N("Elle le dit l’air de rien, comme on demande l’heure. Il n’est pas dupe. Personne ne demande l’heure avec ces yeux-là.")]),
      ("Avec un peu de stress, mais en entier", "stress", [N("Un peu de stress, la voix qui monte à la fin. Mais elle va jusqu’au bout de la phrase. C’est ça qui compte.")])
    ], key="demande"),
    L("Oui. Évidemment oui. … Par contre j’avais prévu de te le demander le 14. J’avais un plan."),
    L("Il était très bien, mon plan. Il avait juste deux semaines de retard."),
    TX("leo", "note pour plus tard : quand j’ai un plan, le donner à Léonore. elle le fera plus vite"),
    ITEM("calendrier", "Un calendrier avec le 2 février entouré deux fois. Le 14, barré. Il rejoint ton inventaire."),
    MEM("📅"),
  ],
  memory={"icon": "📅", "title": "Elle avait deux semaines d’avance", "text": "2 février 2026. C’est elle qui propose qu’ils se mettent ensemble. Lui avait prévu de le faire à la Saint-Valentin. Un vrai pas de sa part, et un plan beaucoup trop lent de la sienne."})

# 7 ─────────────────────────────────────────────────────────────
LETTRE = ("Je t’aime, Matecito. Tu m’apportes tellement de bonheur. On est deux dans cette histoire, et je serai là dans les hauts comme dans les bas. "
          "On prendra les vagues ensemble, le temps que la tempête se calme. Et s’il y a des petits morceaux à recoller, on les recollera ensemble.")
ep("chevet", "Tout est sur la table de nuit", "🌙", "1 minute · rejouable",
  hook=[STAGE(
    [TX("leo", "grosse journée ? ne réponds pas. viens juste voir la table de nuit")],
    [TX("leo", "grosse journée ? ne réponds pas. viens juste voir la table de nuit")])],
  steps=[
    SC(["leonore", "leo"], "INT. LA CHAMBRE — LE SOIR", room=0),
    N("Les soirs où elle est épuisée, il prépare la table de nuit. Il ne demande rien. Il pose tout, et elle choisit."),
    {"t": "recall", "key": "soir", "previous": True, "texts": {
      "serie": "(La dernière fois, c’était une série au lit. L’épisode est resté en pause au même endroit.)",
      "eau": "(La dernière fois, juste un verre d’eau et le silence. Ça avait suffi.)",
      "gateaux": "(La dernière fois, les petits gâteaux. Il en a racheté. Les mêmes.)",
      "plaid": "(La dernière fois, le plaid. Il l’a laissé plié au même endroit.)",
      "calins": "(La dernière fois, des câlins et des bisous. Il prend note : ça marche à tous les coups.)",
      "mot": "(La dernière fois, le petit mot. Il est toujours là, sous le verre.)"}},
    CH("Ce soir, qu’est-ce qui te fait du bien ?", [
      ("Une série au lit", "serie", [N("Une série au lit. Elle tient douze minutes. Il ne lance pas l’épisode suivant. Il attend demain, pour elle.")]),
      ("Un verre d’eau, et c’est tout", "eau", [N("Un verre d’eau, posé à côté des lunettes. Il éteint la grande lumière. Il ne dit rien. C’est exactement ce qu’il fallait.")]),
      ("Les petits gâteaux", "gateaux", [N("Les petits gâteaux, dans le lit. Il ne dit rien des miettes. Il les voit. Il ne dit rien.")]),
      ("Le plaid", "plaid", [N("Le plaid, remonté jusqu’au menton. Il le borde un peu trop serré. Elle le laisse faire.")]),
      ("Des câlins et des bisous", "calins", [N("Des câlins. Des bisous. Pas de discussion. Elle s’endort la tête sur son épaule, et il ne bouge plus jusqu’au matin.")]),
      ("Un mot pour les soirs où ça tangue", "mot", [{"t": "letter", "title": "Pour les soirs où ça tangue", "text": LETTRE, "sign": "Beaugossito", "audio": "vocal-tempete"}])
    ], key="soir", keep="history"),
    N("Avant de dormir, il pense à lui retirer ses lunettes. Il les pose sur la table de nuit, branches pliées."),
    MEM("🌙"),
  ],
  memory={"icon": "🌙", "title": "Tout est sur la table de nuit", "text": "Les soirs d’épuisement : une série au lit, un verre d’eau, des petits gâteaux, un plaid, des câlins et des bisous. Elle choisit, il a tout préparé. Et un mot, pour les soirs où ça tangue : on prendra les vagues ensemble."},
  repeatable=True)

# 8 ─────────────────────────────────────────────────────────────
ep("carte", "Sans regarder la carte", "☕", "1 à 2 minutes",
  hook=[STAGE(
    [TX("leo", "je suis au café. j’ai commandé pour toi sans regarder la carte. pari : j’ai bon")],
    [N("Dans le frigo de {home}, la porte s’ouvre sur l’essentiel : des Ice Tea, des boîtes de raviolis, des tomates.")])],
  steps=[
    SC(["leonore", "leo"], "INT. UN CAFÉ"),
    N("Il commande pour elle sans regarder la carte. Un café. Et si c’est l’après-midi, un Ice Tea."),
    L("Je ne prends aucun risque. Je connais le dossier."),
    SC(["leonore", "leo"], "INT. LA CUISINE — UN SOIR SANS COURSES"),
    N("Un soir sans courses. Le frigo propose : une boîte de raviolis, une tomate."),
    CH("Le dîner, ce sera :", [
      ("Raviolis en conserve, et fiers de l’être", "raviolis", [N("Raviolis en conserve, réchauffés, servis dans de vraies assiettes. Ils trinquent avec de l’Ice Tea. C’est un dîner, ça compte.")]),
      ("Une tomate crue, croquée comme une pomme", "tomate", [N("Elle croque la tomate crue comme une pomme. Il la regarde faire, un peu fasciné, un peu inquiet pour le jus.")]),
      ("Les deux. Un vrai repas improvisé.", "deux", [N("Raviolis en conserve et tomate crue coupée en quatre, en accompagnement. Il appelle ça « un menu de saison ». Personne ne sait quelle saison.")])
    ], key="diner"),
    L("Gosiot mangera des raviolis froids à la fourchette directement dans la boîte. C’est génétique."),
    CH("Et ce soir, on regarde ou on lit ?", [
      ("Un Harry Potter", "hp", [N("Un Harry Potter. Lequel, ce n’est pas la question. La question, c’est combien de fois il va dire « attends, c’est qui lui ? ».")]),
      ("Lire « Dune », chacun son coin du canapé", "dune", [N("Elle lit son livre, « Dune ». Il lit à côté, la page 4 depuis vingt minutes, parce qu’il la regarde lire.")]),
      ("Un film du studio Ghibli", "ghibli", [N("Un Ghibli. Les dessins, la musique, le calme. À la fin, personne ne parle pendant une minute. C’est bon signe.")])
    ], key="soiree"),
    ITEM("tasse", "Un mug pour le café du matin, et l’Ice Tea de l’après-midi. Il rejoint ton inventaire."),
    MEM("☕"),
  ],
  memory={"icon": "☕", "title": "Sans regarder la carte", "text": "Du café, de l’Ice Tea, des raviolis en conserve, une tomate crue. Il n’a plus besoin de la carte. Et les soirs de canapé : Harry Potter, son livre « Dune », ou un Ghibli."})

# 9 ─────────────────────────────────────────────────────────────
ep("rosie", "La même adresse, deux anniversaires", "🔖", "1 à 2 minutes",
  hook=[STAGE(
    [TX("leo", "j’ai réservé quelque part. indice : on connaît déjà le chemin")],
    [N("Deux marque-pages dépassent du même livre, dans {home}. Ils portent la même adresse.")])],
  steps=[
    SC(["leonore", "leo"], "EXT. LE 6ᵉ, PRÈS DE MONTPARNASSE"),
    N("Le 6ᵉ, près de Montparnasse. Le cinéma, les sorties. C’est un des quartiers qui les ont rapprochés : ils y reviennent, et ils finissent toujours par marcher plus que prévu."),
    CH("Dans le quartier, tu repenses d’abord à…", [
      ("Une sortie au cinéma", "cine", [N("Une sortie au cinéma. Le film, on s’en souvient moins que du trajet d’après.")]),
      ("Les rues, à pied, après", "rues", [N("Les rues, à pied, après. Le moment où personne ne veut rentrer le premier.")])
    ], key="quartier"),
    SC(["leonore", "leo"], "INT. ROSIE LOU — SON ANNIVERSAIRE"),
    N("Rosie Lou. C’est là qu’ils ont fêté l’anniversaire de Léonore."),
    MEM("🔖", "a"),
    SC(["leonore", "leo"], "INT. ROSIE LOU — L’ANNIVERSAIRE DE LÉO"),
    N("Et c’est là, ensuite, qu’ils ont fêté celui de Léo. Même adresse."),
    L("On peut dire que c’est notre restaurant ? Ou c’est trop tôt pour avoir un restaurant ?"),
    CH("Tu réponds :", [
      ("« C’est notre restaurant. »", "notre", [N("« C’est notre restaurant. » Il a l’air de quelqu’un à qui on vient de donner les clés d’une maison.")]),
      ("« Deux anniversaires, ça fait une tradition. »", "tradition", [N("« Deux anniversaires, ça fait une tradition. » Il note. Il a déjà une idée pour le troisième.")])
    ], key="restaurant"),
    MEM("🔖", "b"),
    ITEM("marquepage", "Deux marque-pages, une même adresse. Ils rejoignent ton inventaire."),
  ],
  memory={"icon": "🔖", "title": "La même adresse, deux anniversaires", "text": "Rosie Lou : son anniversaire à elle, puis le sien. Le 6ᵉ, près de Montparnasse, le cinéma et les sorties qui les ont rapprochés."},
  memories={
    "a": {"icon": "🔖", "title": "Rosie Lou · l’anniversaire de Léonore", "text": "Rosie Lou, pour l’anniversaire de Léonore. La première fois à cette adresse. Voir aussi : l’anniversaire de Léo, même adresse."},
    "b": {"icon": "🔖", "title": "Rosie Lou · l’anniversaire de Léo", "text": "Rosie Lou, pour l’anniversaire de Léo. Même adresse que pour celui de Léonore : ça devient une tradition."}})

# 10 ────────────────────────────────────────────────────────────
ep("objets", "Les lunettes, les bottines et les briques", "👓", "2 minutes",
  hook=[STAGE(
    [TX("leo", "inventaire du jour : une paire de lunettes, des bottines, une figurine jaune, une carafe qui fait du bruit. viens voir")],
    [N("Un petit carton marqué « À NOUS », dans {home}. Dedans, quatre objets. Rien de précieux. Tout est précieux.")])],
  steps=[
    SC(["leonore", "leo"], "INT. LA CHAMBRE — LE SOIR"),
    N("Les lunettes, d’abord. Le soir, il aime la regarder dans les yeux. Et ils pensent à les poser sur la table de nuit, pour qu’elle ne s’endorme pas avec."),
    L("Je les pose ou tu les poses ? On a un protocole."),
    ITEM("lunettes"),
    N("Les bottines marron, qu’elle porte souvent. Elles ont fait beaucoup de trottoirs, dont certains qu’ils ont faits ensemble."),
    ITEM("bottines"),
    N("La petite figurine Pikachu en briques. Ils l’ont construite ensemble, au début. Elle a une oreille un peu de travers. C’est la meilleure oreille."),
    ITEM("briques"),
    N("Et la carafe poisson. Quand on la redresse, elle fait glouglou."),
    {"t": "sfx", "name": "glouglou"},
    L("Elle fait glouglou. Je ne m’en remets pas."),
    ITEM("carafe"),
    CH("Tu exposes quoi en premier ?", [
      ("La figurine, sur une étagère", "briques", [N("La figurine, sur une étagère. Elle surveille la pièce, l’oreille de travers.")]),
      ("La carafe, pour le glouglou", "carafe", [N("La carafe, bien en vue. Glouglou. Encore. Glouglou.")]),
      ("Les lunettes, sur la table de nuit", "lunettes", [N("Les lunettes, sur la table de nuit, branches pliées. Exactement là où elles doivent être à minuit.")]),
      ("Les bottines, près de la porte", "bottines", [N("Les bottines près de la porte, prêtes pour la prochaine sortie.")])
    ], key="expose"),
    N("Les quatre objets rejoignent ton inventaire. Avec 🎨 Décorer, la figurine peut aller sur une étagère, les lunettes sur une table de nuit, et la carafe fait glouglou quand tu la touches."),
    MEM("👓"),
  ],
  memory={"icon": "👓", "title": "Les lunettes, les bottines et les briques", "text": "Ses lunettes, qu’ils posent sur la table de nuit pour qu’elle ne s’endorme pas avec, et ses yeux le soir. Ses bottines marron. La figurine Pikachu en briques construite ensemble au début. Et la carafe poisson qui fait glouglou."})

# 11 ────────────────────────────────────────────────────────────
ep("affaires", "Les affaires classées de Mathys", "📒", "1 à 2 minutes",
  hook=[STAGE(
    [TX("mathys", "on m’a demandé de rouvrir deux dossiers. je rappelle que les faits sont prescrits")],
    [TX("mathys", "j’ai retrouvé deux vieux dossiers en déménageant mon cahier. je te les montre. tu ne commentes pas")])],
  steps=[
    SC(["leonore", "mathys"], "INT. LE CAHIER D’INCIDENTS — ARCHIVES"),
    N("Le cahier d’incidents de Mathys. Section « Affaires classées ». Il tourne les pages avec une solennité de notaire."),
    P("mathys", "Dossier un. L’airfryer."),
    N("Un poisson oublié une semaine dans l’airfryer. Les mouches sont venues. Puis d’autres bestioles. L’airfryer est désormais « condamné »."),
    {"t": "incident", "text": "Affaire classée : un poisson a passé une semaine dans l’airfryer. L’airfryer est « condamné ». Le poisson aussi, je suppose."},
    CH("Ton commentaire :", [
      ("« Une semaine, Mathys. »", "semaine", [P("mathys", "Six jours et demi. Je demande qu’on soit précis.")]),
      ("« Paix à l’airfryer. »", "paix", [P("mathys", "Merci. Il avait une vie devant lui.")]),
      ("Ne rien dire, juste le regarder", "regard", [P("mathys", "Je sens que tu commentes. Avec les yeux.")])
    ], key="airfryer"),
    P("mathys", "Dossier deux. Après une grosse soirée."),
    N("Le four est resté ouvert toute la nuit. Et les clés étaient du côté extérieur de la porte. Dehors. Sur la porte. Pour tout le monde."),
    {"t": "incident", "text": "Affaire classée : après une grosse soirée, le four est resté ouvert et les clés sur la porte, côté couloir. Personne n’est entré. C’est presque vexant."},
    CH("Ton commentaire :", [
      ("« Les clés DEHORS ? »", "dehors", [P("mathys", "Côté couloir. Il y a une nuance. Je ne sais pas laquelle.")]),
      ("« On a tous eu des soirées. »", "soirees", [P("mathys", "Voilà. Merci. Toi, tu comprends le contexte.")])
    ], key="four"),
    N("Il referme le cahier. Il a l’air presque fier. Les deux pages sont maintenant dans le cahier de Mathys, à relire quand tu veux dans Souvenirs."),
    MEM("📒"),
  ],
  memory={"icon": "📒", "title": "Les affaires classées de Mathys", "text": "Un poisson oublié une semaine dans l’airfryer, des mouches, des bestioles, et un airfryer désormais « condamné ». Et une nuit après une grosse soirée : le four ouvert, les clés du côté extérieur de la porte."})

# 12 ────────────────────────────────────────────────────────────
MERCI = ("Je t’avais gardé ce mot.\n\nQuand j’ai été hospitalisé pour cette infection, puis opéré, tu étais là. "
         "Tu as été gentille, juste, et drôle quand il le fallait. Tu savais quoi dire, et quand ne rien dire.\n\n"
         "Je n’étais pas à mon meilleur. Tu m’as aimé tel que j’étais à ce moment-là, et je ne l’oublierai pas.\n\nMerci.")
ep("hopital", "Le jour où tu étais là", "🤍", "1 minute · scène calme",
  hook=[N("Pas de surprise bruyante aujourd’hui. Juste un mot plié, posé à côté de toi.")],
  steps=[
    SC(["leonore"], "UN MOT GARDÉ"),
    {"t": "letter", "title": "Un mot que je t’avais gardé", "text": MERCI, "sign": "Léo"},
    N("Il y a eu un kyste, une infection, l’hôpital, une opération sous anesthésie générale. Ça, c’est le dossier."),
    N("Ce dont il se souvient, lui, c’est d’elle. Sa gentillesse. Sa justesse. Son humour au bon moment. Et la façon dont elle l’a aimé tel qu’il était, ce jour-là."),
    CH("Tu as envie de…", [
      ("Garder le mot", "garder", [N("Elle plie le mot en deux. Il rejoint l’inventaire, et la boîte des choses qu’on ne jette pas.")]),
      ("Lui écrire un mot en retour", "repondre", [N("Elle se dit qu’elle lui répondra. Sur le frigo, peut-être. Le bouton « Laisser un mot » est dans Proches, quand elle veut.")]),
      ("Rester un moment avec", "rester", [N("Elle reste un moment avec. Il n’y a rien d’autre à faire, et c’est très bien.")])
    ], key="merci"),
    ITEM("carte"),
    MEM("🤍"),
  ],
  memory={"icon": "🤍", "title": "Le jour où tu étais là", "text": "L’hôpital, l’infection, l’opération. Et elle, à côté : gentille, juste, drôle au bon moment. Elle l’a aimé tel qu’il était ce jour-là. Il lui avait gardé un mot pour lui dire merci."},
  ask="Tu le lis maintenant ?")

# 13 ────────────────────────────────────────────────────────────
ep("smur", "Six semaines à Longjumeau", "🚑", "2 minutes",
  hook=[STAGE(
    [TX("leo", "six semaines de SMUR. j’ai des questions. beaucoup. tu as le temps ce soir ?")],
    [N("Dans un tiroir de {home}, un carnet de stage aux pages cornées : « SMUR de Longjumeau ». Ça date. Ça compte encore.")])],
  steps=[
    {"t": "if", "cond": {"flag": "specialty"},
     "then": [SC(["leonore", "leo"], "FLASHBACK — LE RETOUR DE LONGJUMEAU"),
              N("Avant tout le reste, avant la {specialty} : la 6ᵉ année de médecine, les concours de spécialité à préparer, et six semaines au SMUR de Longjumeau.")],
     "else": [SC(["leonore", "leo"], "INT. LE RETOUR DE LONGJUMEAU"),
              N("6ᵉ année de médecine. Les concours de spécialité à préparer. Et elle revient de six semaines au SMUR de Longjumeau.")]},
    N("Un stage mouvementé. Elle l’a aimé."),
    L("Raconte. Ce que tu veux. Je ne poserai pas de questions bêtes. Peut-être une ou deux."),
    CH("Ce que tu as envie de raconter d’abord :", [
      ("Les départs en intervention", "departs", [N("Les départs, l’adrénaline, la route. Il écoute sans l’interrompre. Il pose une seule question bête, à la fin. Elle y répond quand même.")]),
      ("L’équipe", "equipe", [N("L’équipe. Les gens avec qui on passe six semaines comme six mois. Il retient tous les prénoms, pour la prochaine fois.")]),
      ("Ce que ça m’a appris sur moi", "moi", [N("Ce que ça lui a appris sur elle. Il écoute. Il trouve qu’elle se décrit beaucoup moins bien que ce qu’il voit.")]),
      ("Je te raconterai plus tard", "plustard", [N("Elle lui racontera plus tard. Il dit « d’accord ». Il le pense.")])
    ], key="smur"),
    {"t": "if", "cond": {"flag": "specialty"},
     "then": [N("Elle a choisi la {specialty}, plus tard, dans cette vie-là. Le SMUR est resté un souvenir, de ceux qu’on raconte encore.")],
     "else": [N("Après, il y a les concours. Et le choix. Elle hésite encore entre plusieurs voies."),
              CH("Aujourd’hui, tu en es où ?", [
                ("J’hésite encore, et c’est normal", "hesite", [L("C’est normal. Tu as le droit de ne pas savoir. Tu as même le droit de changer d’avis trois fois. Je tiendrai le compte.")]),
                ("Le SMUR m’a donné des idées", "idees", [L("Note-les quelque part. Ou dis-les-moi. Je suis un très bon carnet.")]),
                ("Je ne veux pas en parler ce soir", "pasce", [L("Alors on n’en parle pas. On parle de Gosiot. Il veut être médecin, apparemment. Ou dinosaure.")])
              ], key="voie")]},
    ITEM("carnet", "Le carnet de stage rejoint ton inventaire."),
    MEM("🚑"),
  ],
  memory={"icon": "🚑", "title": "Six semaines à Longjumeau", "text": "6ᵉ année de médecine, les concours de spécialité à préparer, plusieurs voies possibles. Et six semaines au SMUR de Longjumeau : un stage mouvementé, qu’elle a aimé."})

# 14 ────────────────────────────────────────────────────────────
ep("retrouver", "On se retrouvera", "🗝️", "2 minutes",
  hook=[STAGE(
    [TX("leo", "j’ai fait un dessin. c’est un plan. c’est pas à l’échelle. c’est pas un appart. c’est une idée")],
    [N("Sur le mur de {home}, un crochet vide. Il attend quelque chose. Une clé, peut-être.")])],
  steps=[
    SC(["leonore", "leo"], "INT. UN SOIR, SANS RIEN DE SPÉCIAL"),
    L("Je voulais te dire un truc. Pas un plan à la Saint-Valentin, promis. Un vrai."),
    N("Il aimerait qu’ils emménagent ensemble. Dans environ deux ans. Après ses concours, après son choix de spécialité. Pas avant : elle a assez à faire."),
    L("Et si ce que tu choisis t’emmène loin de Paris, je veux que tu choisisses ce dont tu rêves. Pas ce qui m’arrange. Je te soutiendrai."),
    CH("Tu as envie de répondre…", [
      ("« Deux ans, c’est un bon plan. »", "deuxans", [L("Merci. C’est le premier de mes plans qui n’a pas de retard.")]),
      ("« Et si c’est loin ? »", "loin", [L("Alors on fera avec la distance. On l’a déjà fait, entre le Kremlin-Bicêtre et la rue des Ardennes. Ça s’est bien passé.")]),
      ("Le prendre dans tes bras", "bras", [N("Elle le prend dans ses bras. Ça répond à tout.")]),
      ("« Gosiot aura sa chambre ? »", "gosiot", [L("Gosiot aura une chambre, un teckel, et un avis sur tout. Comme ses parents.")])
    ], key="promesse"),
    N("Le plan dessiné sur une feuille n’est pas à l’échelle. Il y a deux bureaux, un canapé, une place pour la carafe qui fait glouglou. Et une flèche, au bas de la page : « ici, on se retrouve »."),
    ITEM("plan"),
    ITEM("cle", "Une clé sur un crochet. Elle n’ouvre encore rien. Pas encore."),
    L("Peu importe où, peu importe quand. On se retrouvera."),
    TX("leo", "six seven. (je sais même pas si je l’utilise bien. c’est toi qui me l’as appris, donc c’est ta faute)"),
    MEM("🗝️"),
  ],
  memory={"icon": "🗝️", "title": "On se retrouvera", "text": "Emménager ensemble dans environ deux ans, après les concours et le choix de spécialité. Et si son projet l’emmène loin de Paris, qu’elle choisisse ce dont elle rêve : il la soutiendra. Une clé, un plan à deux, et la certitude de se retrouver."})

PACK = {
  "format": "milife.pack", "schema": 1, "id": "petites-choses", "version": 2,
  "title": "Les petites choses",
  "note": "Contenu intégré au jeu. Une surprise par journée de jeu, dans l’ordre.",
  "items": {
    "sousbock": {"name": "Sous-bock de la Contrescarpe", "desc": "Une pinte à 15 h, pour rigoler. Puis la neige."},
    "bouleNeige": {"name": "Boule à neige", "desc": "Secoue-la : il neige, comme sur la route du retour."},
    "ticket": {"name": "Le ticket du mauvais arrêt", "desc": "Montmartre, puis la rue de Lappe. Mauvais arrêt, bon baiser."},
    "calendrier": {"name": "Calendrier 2026", "desc": "Le 2 février, entouré deux fois. Le 14, barré : elle avait deux semaines d’avance."},
    "tasse": {"name": "Le mug du café (et de l’Ice Tea)", "desc": "Commandé sans regarder la carte."},
    "marquepage": {"name": "Deux marque-pages Rosie Lou", "desc": "Son anniversaire, puis le sien. Même adresse."},
    "lunettes": {"name": "Ses lunettes", "desc": "Leur place, le soir : la table de nuit. Pas sur le nez à minuit."},
    "bottines": {"name": "Ses bottines marron", "desc": "Celles qu’elle porte souvent."},
    "briques": {"name": "Le Pikachu en briques", "desc": "Construit ensemble, au début. Une oreille un peu de travers."},
    "carafe": {"name": "La carafe poisson", "desc": "Redresse-la : glouglou."},
    "carte": {"name": "Le mot gardé", "desc": "Merci d’avoir été là."},
    "carnet": {"name": "Carnet du SMUR de Longjumeau", "desc": "Six semaines, des pages cornées."},
    "cle": {"name": "La clé", "desc": "Elle n’ouvre encore rien. Pas encore."},
    "plan": {"name": "Le plan à deux", "desc": "Pas à l’échelle. « Ici, on se retrouve. »"}
  },
  "anniversaries": [
    {"id": "premier-rdv", "m": 1, "d": 5, "label": "5 janvier : le premier rendez-vous",
     "steps": [TX("leo", "5 janvier. je dis ça comme ça. ta voisine va bien ?"), N("Le souvenir de la « voisine » est dans Souvenirs, si tu veux le relire.")]},
    {"id": "ensemble", "m": 2, "d": 2, "label": "2 février : elle avait deux semaines d’avance",
     "steps": [TX("leo", "2 février. merci d’avoir été plus rapide que mon plan"), N("« Elle avait deux semaines d’avance » est dans Souvenirs.")]}
  ],
  "media": {},
  "episodes": EP
}

NB = ' '
def fix(s):
    s = re.sub(r' ([?!:;»])', NB + r'\1', s)
    s = re.sub(r'« ', '«' + NB, s)
    return s
def walk(o):
    if isinstance(o, dict): return {k: (walk(v) if k not in ('id', 'who', 't', 'home', 'value', 'key', 'audio', 'media', 'name') or k == 'name' and isinstance(v, str) and ' ' in v else v) for k, v in o.items()}
    if isinstance(o, list): return [walk(x) for x in o]
    if isinstance(o, str): return fix(o)
    return o
out = walk(PACK)
assert len(out["episodes"]) == 14
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = os.path.join(root, 'index.html')
src = open(html, encoding='utf-8').read()
a, b = src.index('/* <contenu> */'), src.index('/* </contenu> */')
block = '/* <contenu> */\nconst CONTENU_INTEGRE = ' + json.dumps(out, ensure_ascii=False, indent=1).replace('</', '<\\/') + ';\n'
open(html, 'w', encoding='utf-8').write(src[:a] + block + src[b:])
print('index.html : CONTENU_INTEGRE v%d, %d épisodes' % (out['version'], len(out['episodes'])))
if len(sys.argv) > 1:
    json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('ok', sys.argv[1])
