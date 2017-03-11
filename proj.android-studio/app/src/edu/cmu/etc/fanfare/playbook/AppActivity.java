/****************************************************************************
Copyright (c) 2015 Chukong Technologies Inc.
 
http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
package edu.cmu.etc.fanfare.playbook;

import android.content.Context;
import android.content.res.ColorStateList;
import android.content.res.TypedArray;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.content.ContextCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.AppCompatTextView;
import android.support.v7.widget.TintTypedArray;
import android.support.v7.widget.Toolbar;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;

import org.w3c.dom.Text;

import java.lang.reflect.Field;

public class AppActivity extends AppCompatActivity {
    private static final String TAG = "AppActivity";

    private DrawerItem[] mMenuItems;
    private DrawerLayout mDrawerLayout;
    private ListView mDrawerList;
    private ActionBarDrawerToggle mDrawerToggle;
    private Toolbar mToolbar;
    private AppCompatTextView mToolbarTextView;

    private class DrawerItemClickListener implements ListView.OnItemClickListener {
        @Override
        public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
            selectItem(position);
        }
    }

    private class DrawerItem {
        String text;
        Drawable icon;
        String fragmentTitle;
        int fragmentColor;
        int fragmentColorDark;
        int titleTextColor;
    }

    private class DrawerItemAdapter extends ArrayAdapter<DrawerItem> {
        private ViewHolder mHolder;

        DrawerItemAdapter(Context context, int resource, DrawerItem[] objects) {
            super(context, resource, objects);
        }

        private class ViewHolder {
            private TextView mTextView;
        }

        @NonNull
        public View getView(int position, View convertView, @NonNull ViewGroup parent) {
            if (convertView == null) {
                convertView = LayoutInflater.from(AppActivity.this)
                    .inflate(R.layout.drawer_list_item, parent, false);

                mHolder = new ViewHolder();
                mHolder.mTextView = (TextView) convertView.findViewById(R.id.text);

                convertView.setTag(mHolder);
            } else {
                mHolder = (ViewHolder) convertView.getTag();
            }

            DrawerItem item = getItem(position);
            if (item != null) {
                mHolder.mTextView.setText(item.text);
                mHolder.mTextView.setCompoundDrawablesRelativeWithIntrinsicBounds(null, item.icon, null, null);

                ColorStateList stateList;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    stateList = getResources().getColorStateList(R.color.drawer_list_item_selector, getTheme());
                    mHolder.mTextView.setCompoundDrawableTintList(stateList);
                }

            }

            return convertView;
        }
    }

    /** Swaps fragments in the main content view */
    private void selectItem(int position) {
        // Create a new fragment based on selected position
        Fragment fragment;
        switch (position) {
            case 1:
                fragment = new PredictionFragment();
                break;
            case 2:
                fragment = new SectionScoreFragment();
                break;
            case 3:
                fragment = new CollectionFragment();
                break;
            case 4:
                fragment = new TreasureHuntFragment();
                break;
            case 5:
                fragment = new SeatSelectFragment();
                break;
            default:
                fragment = new CollectionFragment();
        };

        // Insert the fragment by replacing any existing fragment
        FragmentManager fragmentManager = getSupportFragmentManager();
        fragmentManager.beginTransaction()
                .replace(R.id.content_frame, fragment)
                .commit();

        // Highlight the selected item and close the drawer
        mDrawerList.setItemChecked(position, true);
        mDrawerLayout.closeDrawer(mDrawerList);

        // Set the name in the action bar.
        // We can't use mToolbar here: https://code.google.com/p/android/issues/detail?id=77763
        DrawerItem[] drawerItems = getDrawerItems();
        getSupportActionBar().setTitle(drawerItems[position].fragmentTitle);

        // Change color.
        mToolbar.setBackgroundColor(drawerItems[position].fragmentColor);
        mToolbar.setTitleTextColor(drawerItems[position].titleTextColor);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(drawerItems[position].fragmentColorDark);
        }
    }

    private DrawerItem[] getDrawerItems() {
        String[] menuItems = getResources().getStringArray(R.array.menu_items);
        TypedArray menuItemIcons = getResources().obtainTypedArray(R.array.menu_item_icons);
        String[] menuItemFragmentTitle = getResources().getStringArray(R.array.menu_item_fragment_title);
        TypedArray menuItemFragmentColor = getResources().obtainTypedArray(R.array.menu_item_fragment_color);
        TypedArray menuItemFragmentColorDark = getResources().obtainTypedArray(R.array.menu_item_fragment_color_dark);
        TypedArray menuItemTitleTextColor = getResources().obtainTypedArray(R.array.menu_item_title_text_color);
        DrawerItem[] drawerItems = new DrawerItem[menuItems.length];

        for (int i = 0; i < menuItems.length; i++) {
            DrawerItem drawerItem = new DrawerItem();
            drawerItem.text = menuItems[i];
            drawerItem.icon = menuItemIcons.getDrawable(i);
            drawerItem.fragmentTitle = menuItemFragmentTitle[i];
            drawerItem.fragmentColor = menuItemFragmentColor.getColor(i, ContextCompat.getColor(this, R.color.primary));
            drawerItem.fragmentColorDark = menuItemFragmentColorDark.getColor(i, ContextCompat.getColor(this, R.color.primary_dark));

            // Resolve attr values through the theme.
            TypedValue typedValue = new TypedValue();
            getTheme().resolveAttribute(menuItemTitleTextColor.peekValue(i).data, typedValue, true);
            TypedArray arr = obtainStyledAttributes(typedValue.data, new int[]{ menuItemTitleTextColor.peekValue(i).data });
            drawerItem.titleTextColor = arr.getColor(0, -1);
            arr.recycle();

            Log.d(TAG, "" + Color.alpha(drawerItem.titleTextColor));
            drawerItems[i] = drawerItem;
        }

        menuItemIcons.recycle();
        return drawerItems;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.app_activity);

        mToolbar = (Toolbar) findViewById(R.id.my_toolbar);
        setSupportActionBar(mToolbar);

        mMenuItems = getDrawerItems();
        mDrawerLayout = (DrawerLayout) findViewById(R.id.drawer_layout);
        mDrawerList = (ListView) findViewById(R.id.left_drawer);
        mDrawerToggle = new ActionBarDrawerToggle(this, mDrawerLayout, mToolbar,
                R.string.drawer_open, R.string.drawer_close) {

            /** Called when a drawer has settled in a completely closed state. */
            public void onDrawerClosed(View view) {
                super.onDrawerClosed(view);
                invalidateOptionsMenu(); // creates call to onPrepareOptionsMenu()
            }

            /** Called when a drawer has settled in a completely open state. */
            public void onDrawerOpened(View drawerView) {
                super.onDrawerOpened(drawerView);
                invalidateOptionsMenu(); // creates call to onPrepareOptionsMenu()
            }
        };

        // Setup the menu items
        // Set the adapter for the list view
        mDrawerList.setAdapter(new DrawerItemAdapter(this,
                R.layout.drawer_list_item, mMenuItems));
        // Set the list's click listener
        mDrawerList.setOnItemClickListener(new DrawerItemClickListener());

        // Set the drawer toggle as the DrawerListener
        mDrawerLayout.addDrawerListener(mDrawerToggle);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setHomeButtonEnabled(true);

        // Replace title with our own custom one.
        // We need to set a title, because the title TextView is lazily created.
        mToolbar.setTitle(getString(R.string.app_name));
        try {
            Field field = mToolbar.getClass().getDeclaredField("mTitleTextView");
            field.setAccessible(true);

            Field appearanceField = mToolbar.getClass().getDeclaredField("mTitleTextAppearance");
            appearanceField.setAccessible(true);

            AppCompatTextView titleView = (AppCompatTextView) field.get(mToolbar);
            mToolbarTextView = new OutlinedTextView(this);
            mToolbarTextView.setSingleLine();
            mToolbarTextView.setEllipsize(TextUtils.TruncateAt.END);
            mToolbarTextView.setTextAppearance(this, appearanceField.getInt(mToolbar));

            Typeface typeface = Typeface.createFromAsset(getAssets(), "rockb.ttf");
            mToolbarTextView.setTypeface(typeface);
            mToolbarTextView.setAllCaps(true);

            field.set(mToolbar, mToolbarTextView);
            mToolbar.removeView(titleView);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            Log.e(TAG, e.toString());
        }

        // Set the home screen
        selectItem(0);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_about) {
            return true;
        } else if (id == R.id.action_debug) {
            Cocos2dxBridge.loadScene("SectionSelection");
        }

        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
        // Sync the toggle state after onRestoreInstanceState has occurred.
        mDrawerToggle.syncState();
    }
}
