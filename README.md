# aider.vim

Plugin d'aide minimal pour [aider](https://github.com/Aider-AI/aider) avec
neovim.

## Démo

Vous pouvez invoquer Aider depuis vim

<img src="./demo/aider_default.gif" alt="GIF de démo" width="500">

Vous pouvez envoyer la plage sélectionnée à Aider comme contexte

<img src="./demo/aider_visual_mode.gif" alt="GIF de démo du mode visuel" width="500">

Vous pouvez envoyer le buffer actuel à Aider comme contexte

<img src="./demo/aider_add_current_file.gif" alt="GIF de démo d'ajout du fichier actuel" width="500">

Vous pouvez envoyer des commandes vocales à Aider en utilisant Whisper

<img src="./demo/aider_voice.gif" alt="GIF de démo d'entrée vocale" width="500">

## Prérequis

- [aider](https://github.com/paul-gauthier/aider)
- [denops.vim](https://github.com/vim-denops/denops.vim)

## Paramètres

### vimscript

Veuillez ajouter les paramètres suivants à votre vimrc ou init.vim.

```vim
" Paramètres aider.vim
ex.
" Configuration de la commande Aider
let g:aider_command = 'aider --no-auto-commits'

" Paramètres de la fenêtre flottante
let g:aider_buffer_open_type = 'floating'
let g:aider_floatwin_width = 100
let g:aider_floatwin_height = 20
let g:aider_floatwin_border = "double"
let g:aider_floatwin_border_style = "minimal"

" Paramètre de prompt additionnel
let g:aider_additional_prompt = [
  "Votre prompt additionnel ici",
  "Ceci sera affiché dans la fenêtre flottante lors de l'utilisation des sélections en mode visuel",
  "Vous pouvez le voir et l'éditer avant de l'envoyer à aider",
]

" Mappages de touches
nnoremap <silent> <leader>at :AiderRun<CR>
" Ajouter le fichier actuel à Aider
nnoremap <silent> <leader>aa :AiderAddCurrentFile<CR>
" Ajouter le fichier actuel en lecture seule à Aider
nnoremap <silent> <leader>ar :AiderAddCurrentFileReadOnly<CR>
" Ajouter l'interface web d'Aider
nnoremap <silent> <leader>aw :AiderAddWeb<CR>
" Quitter Aider
nnoremap <silent> <leader>ax :AiderExit<CR>
" Ajouter le fichier actuel à la liste d'ignore d'Aider
nnoremap <silent> <leader>ai :AiderAddIgnoreCurrentFile<CR>
" Ouvrir la liste d'ignore d'Aider
nnoremap <silent> <leader>aI :AiderOpenIgnore<CR>
" Coller le contenu du presse-papiers dans Aider
nnoremap <silent> <leader>ap :AiderPaste<CR>
" Masquer la fenêtre Aider
nnoremap <silent> <leader>ah :AiderHide<CR>
" Masquer la fenêtre Aider en mode terminal
tnoremap <C-x><C-x> <C-\><C-n>:AiderHide<CR>
vmap <leader>av :AiderVisualTextWithPrompt<CR>

" Groupe d'autocommandes pour Aider
augroup AiderOpenGroup
  autocmd!
  autocmd User AiderOpen call s:AiderOpenHandler()
augroup END

function! s:AiderOpenHandler() abort
  " Définir les mappages de touches pour le buffer Aider
  tnoremap <buffer> <Esc> <C-\><C-n>
  nnoremap <buffer> <Esc> :AiderHide<CR>
endfunction
```

### lua (lazy.nvim)

Veuillez ajouter les paramètres suivants à vos paramètres lazy.

```lua
{ "nekowasabi/aider.vim"
  , dependencies = "vim-denops/denops.vim"
  , config = function()
    vim.g.aider_command = 'aider --no-auto-commits'
    vim.g.aider_buffer_open_type = 'floating'
    vim.g.aider_floatwin_width = 100
    vim.g.aider_floatwin_height = 20

    vim.api.nvim_create_autocmd('User',
      {
        pattern = 'AiderOpen',
        callback =
            function(args)
              vim.keymap.set('t', '<Esc>', '<C-\\><C-n>', { buffer = args.buf })
              vim.keymap.set('n', '<Esc>', '<cmd>AiderHide<CR>', { buffer = args.buf })
            end
      })
    vim.api.nvim_set_keymap('n', '<leader>at', ':AiderRun<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aa', ':AiderAddCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ar', ':AiderAddCurrentFileReadOnly<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aw', ':AiderAddWeb<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ax', ':AiderExit<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ai', ':AiderAddIgnoreCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aI', ':AiderOpenIgnore<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aI', ':AiderPaste<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ah', ':AiderHide<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('v', '<leader>av', ':AiderVisualTextWithPrompt<CR>', { noremap = true, silent = true })
  end
  }
```

## Utilisation

Pour utiliser aider.vim, vous pouvez exécuter les commandes suivantes dans Vim ou Neovim :

`Toutes les commandes avec le nom "Silent" envoient des commandes à aider sans déplacer le focus vers le buffer aider.`

- `:AiderRun` - Lance aider ou affiche la fenêtre aider.
- `:AiderAddCurrentFile` - Ajoute le fichier actuel au contexte d'aider.
- `:AiderAddCurrentFileReadOnly` - Ajoute le fichier actuel en lecture seule au
  contexte d'aider.
- `:AiderAddBuffers` - Ajoute tous les buffers actuellement ouverts sous gestion Git au
  contexte d'aider.
- `:AiderSilentAddCurrentFile` - Sans déplacer le focus vers le buffer aider,
  ajoute le fichier actuel au contexte d'aider et actualise le buffer.
- `:AiderSilentAddCurrentFileReadOnly` - Sans déplacer le focus vers le buffer aider,
  ajoute le fichier actuel en lecture seule au contexte d'aider.
- `:AiderExit` - Quitte aider et nettoie la session.
- `:AiderVisualTextWithPrompt` - Édite le texte sélectionné en mode visuel dans une
  fenêtre flottante et l'envoie à aider. Dans la fenêtre flottante, envoyez à aider
  avec `<CR>` en mode normal, et fermez la fenêtre flottante avec `Q`. Vous pouvez
  aussi sauvegarder le prompt avec `q`.
- `:AiderAddPartialReadonlyContext` - Ajoute le texte sélectionné en mode visuel comme
  contexte en lecture seule à Aider.
- `:AiderAddWeb` - Affiche un prompt pour l'URL spécifiée et l'ajoute au
  contexte aider.
- `:AiderOpenIgnore` - Ouvre le fichier `.aiderignore` dans le répertoire racine git
  s'il existe.
- `:AiderAddIgnoreCurrentFile` - Ajoute le fichier actuel au `.aiderignore`.
- `:AiderSendPromptByCommandline <prompt>` - Envoie un prompt depuis la ligne de
  commande et affiche la fenêtre Aider.
- `:AiderSilentSendPromptByCommandline <prompt>` - Envoie un prompt depuis la
  ligne de commande et actualise le buffer.
- `:AiderAsk <question>` - Envoie une question à aider sans ajouter de fichiers au
  contexte.
- `:AiderHide` - Masque la fenêtre flottante et recharge le buffer.
- `:AiderPaste` - Colle le contenu du presse-papiers dans le contexte aider.
- `:AiderHideVisualSelectFloatingWindow` - Masque la fenêtre flottante de sélection visuelle
  utilisée pour afficher le texte sélectionné.
- `:AiderVoice` - Envoie des commandes vocales à Aider (en utilisant Whisper).

### Utilisation avancée

Si vous voulez envoyer un prompt personnalisé à Aider, utilisez
`AiderSendPromptByCommandline`. Configurez-le comme suit :

```vim
" Envoyer un prompt à Aider et afficher la fenêtre Aider
:AiderSendPromptByCommandline "/chat-mode architect"

" Envoyer un prompt à Aider mais ne pas afficher la fenêtre Aider
:AiderSilentSendPromptByCommandline "/chat-mode code"
```

## Prompt additionnel

Vous pouvez définir un prompt additionnel qui sera automatiquement ajouté à chaque
interaction avec aider. Ceci est utile pour définir des règles ou des
directives cohérentes pour l'IA.

Pour utiliser cette fonctionnalité, définissez la variable `g:aider_additional_prompt` dans votre vimrc
ou init.vim :

```vim
let g:aider_additional_prompt = [
  "Votre prompt additionnel ici",
  "Ceci sera affiché dans la fenêtre flottante lors de l'utilisation des sélections en mode visuel",
  "Vous pouvez le voir et l'éditer avant de l'envoyer à aider",
]
```

Ce prompt sera affiché dans la fenêtre flottante lors de l'utilisation des sélections en mode
visuel, vous permettant de le voir et de l'éditer avant de l'envoyer à aider.

## Source ddu

aider.vim fournit une source et un type ddu, qui vous permet de sélectionner facilement
des fichiers de votre dépôt git et de les ajouter au contexte aider.

Pour utiliser cette fonctionnalité, vous devez avoir
[ddu.vim](https://github.com/Shougo/ddu.vim) installé.

Voici un exemple de configuration pour vos paramètres ddu :

```vim
call ddu#custom#patch_global({
    \ 'sources': [{'name': 'aider'}],
    \ 'sourceOptions': {
    \   'aider': {'matchers': ['matcher_substring']},
    \ },
    \ 'kindOptions': {
    \   'aider': {
    \     'defaultAction': 'add',
    \   },
    \ },
    \ })

nnoremap <silent> <Leader>ad
      \ <Cmd>call ddu#start({'sources': [{'name': 'aider'}]})<CR>
```

Avec cette configuration, vous pouvez appuyer sur `<leader>ad` pour ouvrir ddu avec la source
aider. Vous pouvez ensuite sélectionner des fichiers et appuyer sur `<CR>` pour les ajouter au
contexte aider.

### DÉMO

<img src="./demo/aider_ddu_integration.gif" alt="GIF de démo d'intégration Ddu" width="500">

## Remerciements

Outil CLI Aider créé par [Paul Gauthier](https://github.com/paul-gauthier).
