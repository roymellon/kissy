/**
 * @ignore
 * menu controller for kissy,accommodate menu items
 * @author yiminghe@gmail.com
 */
KISSY.add("menu/base", function (S, Event, Component, MenuRender, undefined) {

    var KeyCodes = Event.KeyCodes;

    function afterHighlightedChange(e) {
        var target = e.target;
        if (e.target.isMenuItem && e.newVal) {
            this.set("activeItem", target);
        }
    }

    function beforeHighlightedChange(e) {
        var target = e.target;
        if (e.target.isMenuItem && e.newVal) {
            if (S.inArray(target, this.get('children'))) {
                var h = this.get('highlightedItem');
                if (h && target != h) {
                    h.set('highlighted', false);
                }
            }
            this.set("activeItem", target);
        }
    }

    /**
     * KISSY Menu.
     * xclass: 'menu'.
     * @class KISSY.Menu
     * @extends KISSY.Component.Container
     */
    var Menu = Component.Container.extend({

        isMenu: 1,

        _onSetVisible: function () {
            Menu.superclass._onSetVisible.apply(this, arguments);
            // 通知关闭子菜单
            var h;
            if (h = this.get('highlightedItem')) {
                h.set('highlighted', false);
            }
        },

        bindUI: function () {
            var self = this;
            // screen reader only listen to focusable el
            self.on('beforeHighlightedChange', beforeHighlightedChange, self);
            if (self.get('focusable')) {
                self.on('afterHighlightedChange', afterHighlightedChange, self);
            }
        },

        getRootMenu: function () {
            return this;
        },

        handleMouseEnter: function () {
            Menu.superclass.handleMouseEnter.apply(this, arguments);
            var rootMenu = this.getRootMenu();
            // maybe called by popupmenu, no submenu
            if (rootMenu && rootMenu._popupAutoHideTimer) {
                clearTimeout(rootMenu._popupAutoHideTimer);
                rootMenu._popupAutoHideTimer = null;
            }
            if (this.get('focusable')) {
                this.set('focused', true);
            }
        },

        handleBlur: function (e) {
            Menu.superclass.handleBlur.call(this, e);
            var item;
            if (item = this.get('highlightedItem')) {
                item.set('highlighted', false);
            }
        },


        //dir : -1 ,+1
        //skip disabled items
        _getNextEnabledHighlighted: function (index, dir) {
            var children = this.get("children"),
                len = children.length,
                o = index;
            do {
                var c = children[index];
                if (!c.get("disabled") && (c.get("visible") !== false)) {
                    return children[index];
                }
                index = (index + dir + len) % len;
            } while (index != o);
            return undefined;
        },

        /**
         * Attempts to handle a keyboard event;
         * returns true if the event was handled,
         * false otherwise.
         * If the container is enabled, and a child is highlighted,
         * calls the child controller's {@code handleKeydown} method to give the control
         * a chance to handle the event first.
         * Protected, should only be overridden by subclasses.
         * @param {KISSY.Event.DOMEventObject} e Key event to handle.
         * @return {Boolean|undefined} Whether the event was handled by the container (or one of
         *     its children).
         * @protected
         *
         */
        handleKeyEventInternal: function (e) {

            // Give the highlighted control the chance to handle the key event.
            var highlightedItem = this.get("highlightedItem");

            // 先看当前活跃 menuitem 是否要处理
            if (highlightedItem && highlightedItem.handleKeydown(e)) {
                return true;
            }

            var children = this.get("children"), len = children.length;

            if (len === 0) {
                return undefined;
            }

            var index, destIndex, nextHighlighted;

            //自己处理了，不要向上处理，嵌套菜单情况
            switch (e.keyCode) {
                // esc
                case KeyCodes.ESC:
                    // 清除所有菜单
                    var item;
                    if (item = this.get('highlightedItem')) {
                        item.set('highlighted', false);
                    }
                    break;

                // home
                case KeyCodes.HOME:
                    nextHighlighted = this._getNextEnabledHighlighted(0, 1);
                    break;
                // end
                case KeyCodes.END:
                    nextHighlighted = this._getNextEnabledHighlighted(len - 1, -1);
                    break;
                // up
                case KeyCodes.UP:
                    if (!highlightedItem) {
                        destIndex = len - 1;
                    } else {
                        index = S.indexOf(highlightedItem, children);
                        destIndex = (index - 1 + len) % len;
                    }
                    nextHighlighted = this._getNextEnabledHighlighted(destIndex, -1);
                    break;
                //down
                case KeyCodes.DOWN:
                    if (!highlightedItem) {
                        destIndex = 0;
                    } else {
                        index = S.indexOf(highlightedItem, children);
                        destIndex = (index + 1 + len) % len;
                    }
                    nextHighlighted = this._getNextEnabledHighlighted(destIndex, 1);
                    break;
            }
            if (nextHighlighted) {
                nextHighlighted.set('highlighted', true, {
                    data: {
                        fromKeyboard: 1
                    }
                });
                return true;
            } else {
                return undefined;
            }
        },

        /**
         * Whether this menu contains specified html element.
         * @param {KISSY.NodeList} element html Element to be tested.
         * @return {Boolean}
         * @protected
         */
        containsElement: function (element) {
            var self = this;

            // 隐藏当然不包含了
            // self.get("visible") === undefined 相当于 true
            if (self.get("visible") === false || !self.get("view")) {
                return false;
            }

            if (self.get("view").containsElement(element)) {
                return true;
            }

            var children = self.get('children');

            for (var i = 0, count = children.length; i < count; i++) {
                var child = children[i];
                if (child.containsElement && child.containsElement(element)) {
                    return true;
                }
            }

            return false;
        }
    }, {
        ATTRS: {
            /**
             * Current highlighted child menu item.
             * @type {KISSY.Menu.Item}
             * @property highlightedItem
             */
            /**
             * @ignore
             */
            highlightedItem: {
                // 统一存储，效率换取空间
                getter: function () {
                    var c, children = this.get('children');
                    for (var i = 0; i < children.length; i++) {
                        if ((c = children[i]).get('highlighted')) {
                            return c;
                        }
                    }
                    return undefined;
                }
            },
            /**
             * Current active menu item.
             * Maybe a descendant but not a child of current menu.
             * @type {KISSY.Menu.Item}
             * @property activeItem
             */
            /**
             * @ignore
             */
            activeItem: {
                view: 1
            },
            xrender: {
                value: MenuRender
            },

            defaultChildXClass: {
                value: 'menuitem'
            }
        }
    }, {
        xclass: 'menu',
        priority: 10
    });

    return Menu;

}, {
    requires: ['event', 'component/base', './menu-render']
});

/**
 * @ignore
 * 普通菜单可聚焦
 * 通过 tab 聚焦到菜单的根节点，通过上下左右操作子菜单项
 *
 * TODO
 *  - 去除 activeItem
 **/