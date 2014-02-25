Current format:
	chro, start, end, cluster, direct, peak
Dest format:
{ chromosome:
  [ [pos, direct, peak]+ ]*
}
or
Separate dots and arcs data
  [ [pos, direct, peak]*, [index_start, index_end, distance]* ]
  OU
  [ [pos, direct, peak]*, [index+]* ]

(sorted by pos)

ok. Then, question is length of each segment.

Start with flat!
on a une longueur de chromosome (normalisé à [0,1])
Et un point d'intérêt F(ocus) \in [0,1]
on aimerait une distortion initialement symmétrique autour de F, mais tel que les intervalles pleins [0,F], [F,1] soient mappés sur les intervalles visuels. En fait, rien n'oblige à ce que F corresponde à VF, sa transposition dans l'intervalle visuel (aussi normalisé [0-1].)
J'avais supposé au départ que l'intervalle c[0-F] serait associé à v[0-VF] par une fonction de puissance:

def f(x):
    if x < fp:
        return (x/fp)**n * vf
    else:
        return 1 + (vf-1) * (((1-x)/(1-fp))**n)

Note: Les dérivées sont égales si VF=F. Joy!

aussi:
ne mettre que les tick marks autour du focus.


Bed:
[https://genome.ucsc.edu/FAQ/FAQformat.html#format1](BED)

Bedgraph:
[http://genome.ucsc.edu/goldenPath/help/bedgraph.html](BedGraph)
[http://genome.ucsc.edu/cgi-bin/hgTracks?hgHubConnect.destUrl=..%2Fcgi-bin%2FhgTracks&clade=mammal&org=Human&db=hg19&position=chr21%3A33%2C031%2C597-33%2C041%2C570&hgt.positionInput=enter+position%2C+gene+symbol+or+search+terms&hgt.suggestTrack=knownGene&Submit=submit&hgsid=322886861&pix=1329](UCSC Genome Browser)

GFF3:
[http://www.sequenceontology.org/gff3.shtml](Sequence ontology project)
[http://modencode.oicr.on.ca/validate_gff3_online/validate_gff3.html](validator)

Chromap:
[http://ghr.nlm.nih.gov/dynamicImages/chromomap/chr-1.jpeg](diagramme chromap)

Utiliser les fichiers originaux
Note sur histogramme: Créer structure hiérarchique pcq on ne peut pas réalistement tout montrer. Bin with max height within bin.

Il me faut subordonner les vues à une liste de datasets. Chaque dataset a un ou plusieurs chromosomes. Selon le type de dataset, choix de vues.

Molette pour zoomer

plusieurs focus... ouch!
Solution: Sélectionner un arc long, deux tracks avec des zooms (linéaires!) sur les extrémités de l'arc, et éventuellement des liens entre les tracks.
(une track pour un arc court.)
GFF3 > Bed > Bedgraph
Sélection par nom du gène, avec autocomplete?

cliquer sur un arc-> zoom.
Donc peut-être plusieurs bandes, avec chacune leur scale....

OK j'ai trois problèmes:
1) architecture des vues. On veut imbriquer des vues, parfois de même classe, parfois différente.
-> Chaque vue a un identifiant, en plus du nom de classe. On peut spéficier une vue avec la syntaxe:
  id.id.id:typename:arg1_name=arg1_val:arg2name=arg2_val
Les vues complexes ont elle-mêmes une succession de spécifications pour s'autoformer.
[Note: Les chemins d'ID dans la spécification sont absolus si commencent par un .]
2) architecture des données. Idem: plusieurs fois les mêmes données. Fichier+modèle+gène, qui permet certaines vues.
3) Idéalement, des contraintes: un modèle exige une combinaison de vues. (exprimer avec des classes de vues ayant des chemins complexes.)

Séquence:
	1) Créer une vue, à partir du parent, du nom de la classe, du modèle, et de l'ID.
	La vue s'ajoute d'abord au parent, puis crée ses sous-vues au besoin.

Pour les données: ID fichier + # + nom gène
Noter qu'on crée la vue avec les données... Mais on pourrait imaginer d'offrir de chercher les modèles pertinents à partir des contraintes de la vue. (ça peut attendre.)

Question suivante: Layout!
La vue parent qui a des contraintes de layout pour ses enfants spécifés devrait créer elle-même un env. graphique pour ses enfants.
Par contre, d'autres enfants qui n'ont pas un parent fixe devraient pouvoir demander un env. graphique à un parent générique... ou le créer eux-même?
En général: La vue demande un env. à son parent en se mettant en argument.
OU le parent créée un env. et l'envoie en arg... Ce qui serait plus simple! Mais seulement quand le parent crée. Si l'enfant est envoyé au parent, c'est l'enfant qui pose les questions au parent.

Projet Fantom-Zenbu
http://fantom.gsc.riken.jp/zenbu/gLyphs/#config=nXVNda73KFHqtzNCg5556C;loc=hg18::chr11:127817994..127913245

est-ce que j'associe les modèles à des vues de haut-niveau, ou à des vues de bas-niveau?
ah, la vue de bas-niveau peut dire qu'elle peut prendre le modèle en s'insérant dans X.

18: noter que le 1er élément de gff3 est le gène.
Ramener les gènes à un préfixe commun.
Noter l'absence de sequence-region dans Homo_sapiens_ENSEMBL.gff3


N nombre bases
w nombre pixels
p power zoom factor
fp focus position eg 0
d pixel cache density (base/cache)
x1 nb bases incache
x2 nb bases outcache
cost= x2 +(x1/d)

say fp=N
f(x)=(x/N)**p *w
f'(x)=x**(p-1) *w*p/(N**p)


niveaux de gris:
Calibrer tel que, si les points étaient uniformément distribués, nous aurions du gris 50%.
Graphe continu: Faire une sorte d'intégrale? Ie somme des valeurs.


Certains types sont enchâssés
CDS qui contient des fragments doit être masquée.
Noter que des objets identiques sont hélas répétés. (Sigh.)
Logique du highlight

Visuellement,
1) une track pour le gène dans son ensemble, incluant peut-être des éléments communs (comme le site de binding),
Évidemment, il y aura des cas complexes, lorsqu'il y aura des gènes se chevauchant.
2) une track par protéine (définie par un CDS), avec les fragments de CDS enchâssés dans ces tracks de protéines.
3) D'autres éléments communs auraient leur track, p.e. cDNA etc.
Question: Où iraient donc les exons? dupliqués dans chaque track de protéine/CDS?
Je dupliquerais les exons dans chaque track, mais cette approche pour la visualisation me plait.


Cette approche plus conventionnelle a un avantage sur la vision plus dynamique que j'avais: une vision dynamique dépend de l'interaction, elle n'est donc pas vraiment imprimable.

DONC
1 ligne chromosome
1 série d'allées pour un gène (ajouter les `TF_binding_site`?)
1 série d'allées pour tout le reste
1 série de lanes pour des mRNAs mais en fait les super-CDS. Masquer les mRNAs. (MAIS la longueur est donnée par les mRNA, pas les super-CDS!)
  Chacune de ces lanes contient les fragments CDS ET les exons (qui sont sous les mRNAs! Ouais...)
  le gris: la partie du mRNA qui n'est ni exon ni CDS. Donc une définition en négatif.

De façon générale:
  une région peut-elle contenir des fragments qui se recouvrent?
  supposons que non, c'est simplificateur. (Maxime semble croire que les TF_binding_site devraient ne pas se recouvrir. À vérifier.)
  Et de même, il n'y a qu'un niveau d'enchâssement, donc pas besoin de manipuler la hauteur.
Puis-je quand même généraliser? Nous avons

1. des niveaux escamotés (gènes)
2. des niveaux qui contiennent les autres (sCDS->fCDS, gène->TFbs)
3. des niveaux qui ramassent leurs frères (sCDS->exons)

Noter que tout ça est une intéraction du visuel et du modèle; je crois que ça vaudra la peine de faire un visiteur.
Attention: Comme les exons sont dédoublés, la position verticale est le résultat d'un calcul tenu par le visiteur, et non une propriété de l'objet. (MAIS pour la stabilité il faut quand même faire un précalcul des positions verticales. Cette dynamique ne tient que pour les objets enchâssés.)

Déplacement du focus via drag :
1. Faire un déplacement du focus relatif à l'éloignement par rapport au centre et non plus absolu.
2. Permettre un déplacement plus rapide via shift
3. Permettre un déplacement plus lent via alt
4. 800 millisecondes me parait beaucoup, faudrait voir ce que ça donne avec d'autres valeurs. (fonction checkMouseDown in focusView.ts)

Zoom
1. molette=zoom
2. permettre un zoom sans molettes (shift + clic)
