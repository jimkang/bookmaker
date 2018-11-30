include config.mk

HOMEDIR = $(shell pwd)
BROWSERIFY = ./node_modules/.bin/browserify
UGLIFY = ./node_modules/uglify-es/bin/uglifyjs

pushall: sync
	git push origin master

run:
	wzrd app.js:index.js -- \
		-d

build:
	$(BROWSERIFY) app.js | $(UGLIFY) -c -m -o index.js

prettier:
	prettier --single-quote --write "**/*.js"

sync:
	rsync -a $(HOMEDIR)/ $(USER)@$(SERVER):/$(APPDIR) --exclude node_modules/ \
		--omit-dir-times --no-perms

build-pdf:
	convert "~/Downloads/book/*.{png,jpg}" -background black -quality 100 pdf/where-in-space-are-you.pdf

