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

    var validatePassword = function(password) {
        if (password.length < 8) {
            return 1;
        }
        if (password == 'kansalaisrajoite' ||
            password == 'salasana' ||
            password == 'password') {
            return 2;
        }

        return 0;
    }

    var restrictionStateForMustache = function(item) {
        item.isNew      = (item.state === 'NEW');
        item.isApproved = (item.state === 'APPROVED');
        item.isRejected = (item.state === 'REJECTED');
    }

    /* modal event handlers start */
    $(document).on('click', '.link-login', function() {
        jQuery.facebox($.Mustache.render('dialog-login'));
        $('input:first').focus();
        return false;
    });

    $(document).on('click', '.link-register', function() {
        jQuery.facebox($.Mustache.render('dialog-register'));
        $('input:first').focus();
        return false;
    });

    $(document).on('click', '.link-loginregister', function() {
        jQuery.facebox($.Mustache.render('dialog-register'));
        $('input:first').focus();
        return false;
    });

    $(document).on('click', '.link-registerlogin', function() {
        jQuery.facebox($.Mustache.render('dialog-login'));
        $('input:first').focus();
        return false;
    });

    $(document).on('click', '.link-forgotpassword', function() {
        jQuery.facebox($.Mustache.render('dialog-lostpassword'));
        $('input:first').focus();
        return false;
    });
    /* modal event handlers end */

    /* login event handlers */
    $(document).on('submit', '#login', function(e) {
        e.preventDefault();
        $('p.alert').hide();

        $.ajax({
            url: 'user/login',
            global: false,
            data: {
                email: $('#login input[name=email]').val(),
                password: $('#login input[name=password]').val()
            },
            type: 'POST',
            statusCode: {
                200: function(data) {
                    user.setLoggedIn(data);
                    show('header', 'headerbox', user);
                    jQuery(document).trigger('close.facebox');
                    routie.reload();
                },
                400: function() {
                    $('p.alert.wrongpw').show('fast');
                },
                401: function() {
                    $('p.alert.wrongpw').show('fast');
                },
                412: function() {
                    $('p.alert.notverified').show('fast');
                }
            }
        });
    });

    $(document).on('click', '.link-logout', function() {
        $.ajax({
            url: 'user/logout',
            type: 'POST',
            success: function() {
                user.setLoggedOut();
                show('header', 'headerbox', user);
                notification.setInfo('Kirjauduit ulos');

                if (window.location.hash === '') {
                    routie.reload();
                } else {
                    routie('');
                }
            }
        });

        return false;
    });
    /* login event handlers end */

    // registration event handlers
    $(document).on('submit', '#register', function(e) {
        var name = $('#register input[name=name]').val(),
            city = $('#register input[name=city]').val(),
            email = $('#register input[name=email]').val(),
            pass = $('#register input[name=password]').val();

        e.preventDefault();
        $('p.alert').hide();

        switch (validatePassword(pass)) {
            case 1:
                $('p.alert.pwlength').show('fast');
                return;
            case 2:
                $('p.alert.pwsimple').show('fast');
                return;
        }

        $.ajax({
            url: 'user/register',
            global: false,
            data: {
                email: email,
                password: pass,
                name: name,
                city: city,
            },
            type: 'POST',
            statusCode: {
                200: function(data) {
                    jQuery(document).trigger('close.facebox');
                    show('section', 'verification-sent', null, 'Rekisteröityminen');
                },
                400: function() {
                    $('p.alert.badrequest').show('fast');
                },
                409: function() {
                    $('p.alert.conflict').show('fast');
                }
            }
        });
    });

    // account infomation modify handler
    $(document).on('submit', '#changeinfo', function(e) {
        var name = $('#changeinfo input[name=name]').val(),
            city = $('#changeinfo input[name=city]').val(),
            pass = $('#changeinfo input[name=password]').val();

        e.preventDefault();
        $('p.alert').hide();
        $('p.info').hide();

        if (pass.length > 0) {
            switch (validatePassword(pass)) {
                case 1:
                    $('p.alert.pwlength').show('fast');
                    return;
                case 2:
                    $('p.alert.pwsimple').show('fast');
                    return;
            }
        }

        $.ajax({
            url: 'user',
            global: false,
            data: {
                password: pass,
                name: name,
                city: city,
            },
            type: 'POST',
            statusCode: {
                200: function(data) {
                    user.setLoggedIn(data);
                    show('header', 'headerbox', user);
                    $('p.info.done').show('fast');
                },
                400: function() {
                    $('p.alert.badrequest').show('fast');
                },
                409: function() {
                    $('p.alert.conflict').show('fast');
                }
            }
        });
    });

    // forgotten password event handlers
    $(document).on('submit', '#forgotpass', function(e) {
        var email = $('#forgotpass input[name=email]').val();

        e.preventDefault();
        $('p.alert').hide();
        $('p.info').hide();

        $.ajax({
            url: 'user/reset-password-1',
            global: false,
            data: {
                email: email
            },
            type: 'POST',
            complete: function(jqXHR, textStatus) {
                switch (jqXHR.status) {
                    case 200:
                        $('p.info.emailsent').show('fast');
                        break;
                    case 400:
                        $('p.alert.badrequest').show('fast');
                        break;
                    default:
                        $('p.alert.generic').show('fast');
                        break;
                }
            }
        });
    });

    $(document).on('submit', '#newpass', function(e) {
        var pass = $('#newpass input[name=password]').val()
        email = $('#newpass input[name=email]').val(),
            token = $('#newpass input[name=token]').val();

        e.preventDefault();
        $('p.alert').hide();
        $('p.info').hide();

        switch (validatePassword(pass)) {
            case 1:
                $('p.alert.pwlength').show('fast');
                return;
            case 2:
                $('p.alert.pwsimple').show('fast');
                return;
        }

        $.ajax({
            url: 'user/reset-password-2',
            global: false,
            data: {
                password: pass,
                email: email,
                token: token
            },
            type: 'POST',
            complete: function(jqXHR, textStatus) {
                switch (jqXHR.status) {
                    case 200:
                        $('p.info.done').show('fast');
                        break;
                    default:
                        $('p.alert.generic').show('fast');
                        break;
                }
            }
        });
    });
    /* forgotten password event handlers end */

    /* restriction view click handlers */
    $(document).on('click', 'input[name="vote"]', function() {
        $.ajax({
            url: 'vote/' + $(this).data('restriction-id'),
            type: 'POST',
            success: function() {
                routie.reload();
            }
        });
    });

    $(document).on('click', 'input[name="approve"]', function() {
        $.ajax({
            url: 'restriction/' + $(this).data('restriction-id') + '/approve',
            type: 'POST',
            success: function() {
                routie.reload();
            }
        });
    });

    $(document).on('click', 'input[name="reject"]', function() {
        $.ajax({
            url: 'restriction/' + $(this).data('restriction-id') + '/reject',
            type: 'POST',
            data: {
                reason: prompt('Syy hylkäämiselle:')
            },
            success: function() {
                routie.reload();
            }
        });
    });

    $(document).on('click', 'input[name="delete"]', function() {
        if (window.confirm('Oletko varma, että haluat poistaa rajoitteen?')) {
            $.ajax({
                url: 'restriction/' + $(this).data('restriction-id'),
                type: 'DELETE',
                success: function() {
                    notification.setInfo('Rajoite poistettu');
                    routie('!/rajoitteet');
                }
            });
        }
    });

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

    // new restriction submit button click handler
    $(document).on('submit', '#newrestriction', function(e) {
        e.preventDefault();

        $.ajax({
            url: 'restriction',
            global: false,
            data: {
                title: $('#newrestriction input[name=title]').val(),
                body: $('#newrestriction textarea[name=body]').val(),
                name: $('#newrestriction input[name=name]').val(),
                city: $('#newrestriction input[name=city]').val()
            },
            type: 'POST',
            statusCode: {
                200: function(data) {
                    notification.setInfo('Rajoite luotu');
                    routie('!/rajoite/' + data.id + '/' + data.slug);
                },
                400: function() {
                    notification.setError('Kaikki kentät ovat pakollisia');
                    notification.show();
                }
            }
        });
    });

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
            $.getJSON('user', function(data) {
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
                        $.getJSON('restriction', function(data) {
                            showRestrictions(data, order);
                        });
                    },
                    '!/rajoite/:id/:slug?': function(id, slug) {
                        // store users' scroll position before navigating forward
                        user.scrollPosition = $(document).scrollTop();

                        // scroll to top
                        scrollTo('body');

                        $.getJSON('restriction/' + id, function(data) {
                            data.date = function() {
                                return convertToDateStr;
                            };
                            data.isAdmin = (user.info ? user.info.admin : false);
                            restrictionStateForMustache(data);
                            show('section', 'restriction', data, 'Kielletään: ' + data.title);
                        });
                    },
                    '!/rajoita': function() {
                        if (user.isLogged) {
                            show('section', 'restrict', user, 'Rajoita');
                        } else {
                            show('section', 'error-login', null, 'Virhe');
                        }
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
                        $.getJSON('news', function(data) {
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
                    },
                    '!/muuta-tietoja': function() {
                        if (user.isLogged) {
                            $.getJSON('user', function(data) {
                                show('section', 'account-edit', data, 'Muuta tietoja');
                            });
                        } else {
                            show('section', 'error-login', null, 'Virhe');
                        }
                    },
                    '!/vahvista/:email/:token': function(email, token) {
                        $.ajax({
                            url: 'user/verify',
                            global: false,
                            data: {
                                email: email,
                                token: token
                            },
                            type: 'POST',
                            statusCode: {
                                200: function(data) {
                                    user.setLoggedIn(data);
                                    show('header', 'headerbox', user);
                                    show('section', 'verification', user, 'Rekisteröityminen');
                                },
                                401: function(data) {
                                    show('section', 'verification', null, 'Virhe');
                                }
                            }
                        });
                    },
                    '!/uusi-salasana/:email/:token': function(email, token) {
                        var data = {
                            email: email,
                            token: token
                        };
                        show('section', 'new-password', data, 'Uusi salasana');
                    },
                    '*': function() {
                        // show 404 page for other urls
                        show('section', 'error-notfound', null, 'Sivua ei löytynyt');
                    }
                });
            });
        });
});