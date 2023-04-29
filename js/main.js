$(function() {
    var defaultLocale = 'fi-Fi';
    var baseTitle = document.title;

    // user information
    var user = {
        isLogged: false,
        info: null,
        scrollPosition: null,
        setLoggedIn: function(info) {
            this.isLogged = true;
            this.info = info;
        },
        setLoggedOut: function() {
            this.isLogged = false;
            this.info = null;
        }
    };

    var notification = {
        msg: null,
        type: null,
        setError: function(msg) {
            this.msg = msg;
            this.type = 'alert notification';
        },
        setInfo: function(msg) {
            this.msg = msg;
            this.type = 'info notification';
        },
        show: function() {
            $('#notification').hide();

            if (this.msg) {
                $('#notification').html(this.msg).attr('class', this.type).show('fast');
                this.msg = null;
                this.type = null;
            }
        }
    }

    var convertToDateStr = function(text, render) {
        var timestamp = parseInt(render(text)) * 1000;
        return new Date(timestamp).toLocaleDateString(defaultLocale);
    }

    var percentCompleted = function(text, render) {
        var threshold = 101;
        return ((Math.min(parseInt(render(text)), threshold) / threshold) * 100);
    }

    var show = function(element, template, data, title) {
        if (element === 'section') {
            notification.show();

            if (title) {
                document.title = title;
            } else {
                document.title = baseTitle;
            }
        }

        $(element).mustache(template, (data === undefined ? null : data), {
            method: 'html'
        });
        $('.tooltip').tooltipster();
    }

    var scrollTo = function(element) {
        $(element)[0].scrollIntoView();
    }

    var restrictionStateForMustache = function(item) {
        item.isNew      = (item.state === 'NEW');
        item.isApproved = (item.state === 'APPROVED');
        item.isRejected = (item.state === 'REJECTED');
    }

    /* restriction view click handlers */
    $(document).on('click', 'a.sharefb', function() {
        var url = 'https://www.facebook.com/sharer.php?s=100' + '&p[url]=' + encodeURIComponent(location.href) + '&p[images][0]=' + encodeURIComponent(location.origin + '/img/logo.png') + '&p[title]=' + encodeURIComponent('Kielletään ' + $(this).data('title')) + '&p[summary]=' + encodeURIComponent('Kansalaisrajoite.fi - mitä kieltäisimme seuraavaksi?');
        window.open(url, '_blank');
        return false;
    });

    $(document).on('click', 'a.sharetw', function() {
        var url = 'https://twitter.com/home?status=' + encodeURIComponent('Kielletään ' + $(this).data('title')) + ': ' + encodeURIComponent(location.href) + encodeURIComponent(' #kansalaisrajoite');
        window.open(url, '_blank');
        return false;
    });
    /* restriction view click handlers end */

    /* content functions */
    var showRestrictions = function(data, order) {
        // sort functions
        var sort = {
            byAge: function(a, b) {
                return b.created - a.created
            },
            byVotes: function(a, b) {
                return b.votes - a.votes
            },
            byTitle: function(a, b) {
                return a.title.localeCompare(b.title, defaultLocale);
            }
        }

        switch (order) {
            case 'aika':
            default:
                data.restrictions.sort(sort.byAge);
                data.sort = {
                    byAge: true,
                    byAgeDesc: true
                }
                break;
            case '-aika':
                data.restrictions.sort(sort.byAge).reverse();
                data.sort = {
                    byAge: true
                }
                break;
            case 'aanet':
                data.restrictions.sort(sort.byVotes);
                data.sort = {
                    byVotes: true,
                    byVotesDesc: true
                }
                break;
            case '-aanet':
                data.restrictions.sort(sort.byVotes).reverse();
                data.sort = {
                    byVotes: true
                }
                break;
            case 'otsikko':
                data.restrictions.sort(sort.byTitle);
                data.sort = {
                    byTitle: true,
                    byTitleDesc: true
                }
                break;
            case '-otsikko':
                data.restrictions.sort(sort.byTitle).reverse();
                data.sort = {
                    byTitle: true
                }
                break;
        }

        data.date = function() {
            return convertToDateStr;
        };
        data.percentCompleted = function() {
            return percentCompleted;
        };

        for (i = 0; i < data.restrictions.length; i++) {
            restrictionStateForMustache(data.restrictions[i]);
        }

        show('section', 'restrictions', data, 'Rajoitteet');

        // Restore users' scroll position when navigating back to restrictions
        if (user.scrollPosition) {
            $(document).scrollTop(user.scrollPosition);
            delete user.scrollPosition;
        }

    }
    /* content functions end */

    // load templates
    $.Mustache.load('templates.html')
        .done(function() {

            // catch all ajax errors and show error page
            $(document).ajaxError(function(event, request, settings) {
                switch (request.status) {
                    case 401:
                        show('section', 'error-login', null, 'Virhe');
                        break;
                    case 403:
                        show('section', 'error-unauthorized', null, 'Virhe');
                        break;
                    case 404:
                        show('section', 'error-notfound', null, 'Virhe');
                        break;
                    default:
                        show('section', 'error-generic', null, 'Virhe');
                        break;
                }
            });

            // load and display login status
            $.getJSON('data/user.json', function(data) {
                if (data.name !== undefined) {
                    user.setLoggedIn(data);
                } else {
                    user.setLoggedOut();
                }

                show('header', 'headerbox', user);

                // setup routing
                routie({
                    '': function() {
                        // default to the front page
                        show('section', 'frontpage');
                    },
                    '!/etusivu': function() {
                        show('section', 'frontpage');
                    },
                    '!/rajoitteet/:order?': function(order) {
                        $.getJSON('data/restriction.json', function(data) {
                            showRestrictions(data, order);
                        });
                    },
                    '!/rajoite/:id/:slug?': function(id, slug) {
                        // store users' scroll position before navigating forward
                        user.scrollPosition = $(document).scrollTop();

                        // scroll to top
                        scrollTo('body');

                        $.getJSON('data/restriction/' + id + '.json', function(data) {
                            data.date = function() {
                                return convertToDateStr;
                            };
                            data.isAdmin = (user.info ? user.info.admin : false);
                            restrictionStateForMustache(data);
                            show('section', 'restriction', data, 'Kielletään: ' + data.title);
                        });
                    },
                    '!/ohjeet/:anchor?': function(anchor) {
                        show('section', 'guide', null, 'Ohjeet');
                        if (anchor) {
                            scrollTo('#' + anchor);
                        } else {
                            scrollTo('body');
                        }
                    },
                    '!/tiedotteet': function() {
                        $.getJSON('data/news.json', function(data) {
                            data.hasNews = (data.news.length > 0);
                            data.date = function() {
                                return convertToDateStr;
                            };
                            show('section', 'news', data, 'Tiedotteet');
                        });
                    },
                    '!/pasvenska': function() {
                        show('section', 'pasvenska', null, 'På svenska');
                    },
                    '!/inenglish': function() {
                        show('section', 'inenglish', null, 'In english');
                    }
                });
            });
        });
});