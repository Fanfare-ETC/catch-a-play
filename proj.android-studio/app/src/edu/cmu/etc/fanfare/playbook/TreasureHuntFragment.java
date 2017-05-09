package edu.cmu.etc.fanfare.playbook;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Vibrator;
import android.support.constraint.ConstraintLayout;
import android.util.AttributeSet;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.ImageView;
import android.widget.TextView;

import com.koushikdutta.async.future.Future;
import com.koushikdutta.async.http.AsyncHttpClient;
import com.koushikdutta.async.http.WebSocket;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.Vector;

import static android.content.Context.VIBRATOR_SERVICE;

public class TreasureHuntFragment extends PlaybookFragment implements View.OnClickListener,View.OnTouchListener{


    private final JSONObject obj = new JSONObject();
    private final Exception callbackException[] = {null};
    private final WebSocket callbackWs[] = {null};
    private websocketHandler wsh = new websocketHandler();

    private static int section;
    private static View view;
    private ConstraintLayout layout;
    private int plusoneId,plustenWarmerId,plustenColderId,plustenMarkerId;
    private int warmerSectionId,colderSectionId,markerSectionId;
    private ImageView warmerView,colderView,markerView,aggregateView,mapView;
    private static boolean firstLoad=true;
    private Vibrator myVib;
    private BirdDrawing birdDrawing;
    private BoatDrawing boatDrawing;

    private  String mEndpoint = "ws://" +
            BuildConfig.PLAYBOOK_TREASUREHUNT_API_HOST + ":" +
            BuildConfig.PLAYBOOK_TREASUREHUNT_API_PORT;

    public static class gameState
    {
        public static boolean game_on=false;
        public static boolean flag1=false;
        public static boolean flag2=false;
        public static boolean flag3=false;
        public static boolean game_off=true;
    }


    public static class LinesView extends View {

        private View mWarmerView,mColderView,mMarkerView,mAggregateView,mMapView;

        public static int[] warmerLocation = new int[2];
        public static int[] colderLocation = new int[2];
        public static int[] markerLocation = new int[2];
        public static int[] canvasLocation = new int[2];
        public static int[] mapLocation    = new int[2];

        private static boolean firstLoad = true;

        public LinesView(Context context) {
            super(context);
        }

        public LinesView(Context context, AttributeSet attributeSet) {
            super(context, attributeSet);
        }

        public void setWarmerView(View warmerView) {
            mWarmerView = warmerView;
        }
        public void setColderView(View colderView) {
            mColderView = colderView;
        }
        public void setMarkerView(View markerView) {
            mMarkerView = markerView;
        }
        public void setAggregateView(View aggView) {
            mAggregateView = aggView;
        }
        public void setMapView(View mapView) {
            mMapView = mapView;
        }


        @Override
        public void onDraw(Canvas canvas) {
            super.onDraw(canvas);

            if (firstLoad) {
                // Draw lines only when everything is set up.
                if (mWarmerView == null || mColderView == null ||
                        mMarkerView == null) {
                    return;
                }
                int minwidth = (int) view.getWidth() / 3;
                int minheight = 116;

                mWarmerView.setMinimumWidth(minwidth);
                mWarmerView.setMinimumHeight(minheight);
                mColderView.setMinimumWidth(minwidth);
                mColderView.setMinimumHeight(minheight);
                mMarkerView.setMinimumWidth(minwidth);
                mMarkerView.setMinimumHeight(minheight);

                mWarmerView.getLocationInWindow(warmerLocation);
                mColderView.getLocationInWindow(colderLocation);
                mMarkerView.getLocationInWindow(markerLocation);
                this.getLocationInWindow(canvasLocation);

                // Compute the midpoints of these locations.
                warmerLocation[0] = warmerLocation[0] + mWarmerView.getWidth() / 2 - canvasLocation[0];
                warmerLocation[1] = warmerLocation[1] + mWarmerView.getHeight() / 2 - canvasLocation[1];
                colderLocation[0] = colderLocation[0] + mColderView.getWidth() / 2 - canvasLocation[0];
                colderLocation[1] = colderLocation[1] + mColderView.getHeight() / 2 - canvasLocation[1];
                markerLocation[0] = markerLocation[0] + mMarkerView.getWidth() / 2 - canvasLocation[0];
                markerLocation[1] = markerLocation[1] + mMarkerView.getHeight() / 2 - canvasLocation[1];

                mMarkerView.getLocationInWindow(markerLocation);
                int bottom = markerLocation[1] - canvasLocation[1]; //(mMarkerView.getHeight())

                mMapView.getLocationInWindow(mapLocation);
                int top = mapLocation[1] + (mMapView.getHeight()) - canvasLocation[1];

                Log.d("height", Integer.toString(top) + " " + Integer.toString(bottom));
                mAggregateView.setY(bottom - top);

                float scale_y=(float)(bottom+top)/mAggregateView.getHeight();
                Log.d("height",Float.toString(scale_y));
                mAggregateView.setScaleY(scale_y);
                /*
                for(int i =0;i<5;i++)
                {
                    vertex.get(i).getLocationInWindow(loc0);
                    vertex.get(i+1).getLocationInWindow(loc1);
                    loc0[0] -= canvasLocation[0];
                    loc0[1] -= canvasLocation[1];
                    loc1[0] -= canvasLocation[0];
                    loc1[1] -= canvasLocation[1];
                    canvas.drawLine(loc0[0], loc0[1], loc1[0], loc1[1], mPaint);
                }
                */
                firstLoad=false;
            }
        }
    }

    @Override
    public View onCreateView(final LayoutInflater inflater, final ViewGroup container,
                             Bundle savedInstanceState) {

        super.onCreateView(inflater, container, savedInstanceState);
        view=inflater.inflate(R.layout.treasurehunt_fragment, container, false);

        SharedPreferences settings = this.getActivity().getSharedPreferences("FANFARE_SHARED", 0);
        section = settings.getInt("section", 0) - 1;

        layout = (ConstraintLayout) view.findViewById(R.id.treasurehunt_layout);
        plusoneId = R.drawable.plusone;
        plustenWarmerId = R.drawable.plusten_w;
        plustenColderId = R.drawable.plusten_c;
        plustenMarkerId = R.drawable.plusten_m;
        warmerSectionId = R.id.warmer;
        colderSectionId = R.id.colder;
        markerSectionId = R.id.marker;

        TextView warmer_text = (TextView) view.findViewById(R.id.warmer_text);
        Typeface tf = Typeface.createFromAsset(getActivity().getAssets(), "fonts/nova2.ttf");
        warmer_text.setTypeface(tf);
        warmer_text.setTextSize(24);
        warmer_text.setText("Getting\nWarmer!");

        TextView colder_text = (TextView) view.findViewById(R.id.colder_text);
        colder_text.setZ(0.0f);
        colder_text.setTypeface(tf);
        colder_text.setTextSize(24);
        colder_text.setText("Getting\nColder!");

        TextView plant_text = (TextView) view.findViewById(R.id.marker_text);
        plant_text.setTypeface(tf);
        plant_text.setTextSize(24);
        plant_text.setText("Drop\nMarker!");

        warmerView = (ImageView) view.findViewById(warmerSectionId);
        warmerView.setOnClickListener(this);
        colderView = (ImageView) view.findViewById(colderSectionId);
        colderView.setOnClickListener(this);
        markerView = (ImageView) view.findViewById(markerSectionId);
        markerView.setOnClickListener(this);

        aggregateView = (ImageView) view.findViewById(R.id.aggregate);
        aggregateView.setOnTouchListener(this);
        mapView=(ImageView) view.findViewById(R.id.map);

        setHasOptionsMenu(true);

        view.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
            @Override
            public void onGlobalLayout() {
                view.getViewTreeObserver().removeOnGlobalLayoutListener(this);

                LinesView linesView = (LinesView) view.findViewById(R.id.linesView);
                linesView.setWarmerView(warmerView);
                linesView.setColderView(colderView);
                linesView.setMarkerView(markerView);
                linesView.setAggregateView(aggregateView);
                linesView.setMapView(mapView);
                linesView.invalidate();
            }
        });

        myVib = (Vibrator) getActivity().getSystemService(VIBRATOR_SERVICE);

        //mEndpoint="ws://128.2.238.137:9000";
        Future<WebSocket> webSocket= AsyncHttpClient.getDefaultInstance().websocket(mEndpoint, null, wsh);

        //birdDrawing = new BirdDrawing(view,section);
        boatDrawing = new BoatDrawing(view,section);

        return view;

    }
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        super.onCreateOptionsMenu(menu, inflater);
        inflater.inflate(R.menu.menu_collection, menu);
    }
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.menu_collection_tutorial:
                showTutorial();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }
    void showTutorial()
    {
        ImageView tut = (ImageView) view.findViewById(R.id.treasurehunt_tutorial);
        tut.setVisibility(View.VISIBLE);
        tut.setZ(1.0f);
        if(gameState.game_on)
        {
            tut.setImageResource(R.drawable.connectdots_tutorial_skippable);
            tut.setOnClickListener(this);
        }
        else
        {
            tut.setImageResource(R.drawable.connectdots_tutorial_unskippable);
        }

    }
    public View onResumeView(final LayoutInflater inflater, final ViewGroup container,
                             Bundle savedInstanceState) {
        return view;
    }
    public void processState(JSONObject jsonObject)
    {
        try {
            gameState.game_on=jsonObject.getBoolean("game_on");
            gameState.flag1=jsonObject.getBoolean("flag1");
            gameState.flag2=jsonObject.getBoolean("flag2");
            gameState.flag3=jsonObject.getBoolean("flag3");
            gameState.game_off=jsonObject.getBoolean("game_off");
            Log.d("tstate", Boolean.toString(gameState.game_on)+" 1: "+Boolean.toString(gameState.flag1)+" 2: "+Boolean.toString(gameState.flag2)+" 3: "+Boolean.toString(gameState.flag3)+" "+Boolean.toString(gameState.game_off));
        } catch (JSONException e) {
            e.printStackTrace();
        }

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if(gameState.game_off) {
                    //if(section==1)
                        //stopGame(R.drawable.bird_drawing);
                    //if(section==0)
                        stopGame(R.drawable.boat_drawing);
                }
                else {
                    if (gameState.flag1) {
                        //if(section==1)
                            //updateMarker(R.id.bird_v3);
                        //if(section==0)
                            updateMarker(R.id.boat_v4);
                    }
                    if (gameState.flag2) {
                       // if(section==1)
                            //updateMarker(R.id.bird_v1);
                        //if(section==0)
                            updateMarker(R.id.boat_v5);
                    }
                    if (gameState.flag3)
                        updateMarker_3();
                    else
                    {
                        if (!gameState.game_on && !gameState.game_off) {
                            showTutorial();
                            firstLoad = true;
                        }
                        else {
                            if (gameState.game_on && (!gameState.flag1 && !gameState.flag2 && !gameState.flag3 && !gameState.game_off)) {
                                if(firstLoad) {
                                    showTutorial();
                                    firstLoad = false;
                                }
                               // if(section==1)
                                    //startGame(R.id.bird_v0);
                                //if(section==0)
                                    startGame(R.id.boat_v3);
                            }
                        }

                    }
                }
                //if(section==1) {
                    //BirdDrawing.connectDots cd1 = (BirdDrawing.connectDots) view.findViewById(R.id.bird_connectDots);
                    //cd1.invalidate();
                //}
                //if(section==0) {
                    BoatDrawing.connectDots cd2 = (BoatDrawing.connectDots) view.findViewById(R.id.boat_connectDots);
                    cd2.invalidate();
               // }
            }
        });
    }
    public void  updateMarker(int vertex_id)
    {
        ImageView v3 = ((ImageView) view.findViewById(vertex_id));
        int[] loc0 = new int[2];
        int[] canvasLocation = new int[2];
        view.getLocationInWindow(canvasLocation);
        ImageView ex = (ImageView) view.findViewById(R.id.ex);
        v3.getLocationInWindow(loc0);
        loc0[0] -= canvasLocation[0]+50 ;
        loc0[1] -= canvasLocation[1]+50 ;
        ex.setX(loc0[0]);
        ex.setY(loc0[1]);
        int h=ex.getHeight()/2;
        int w=ex.getWidth()/2;
        ImageView glow = (ImageView) view.findViewById(R.id.glow);
        glow.setX(loc0[0]-w);
        glow.setY(loc0[1]-h);
        glowanimation(glow);

    }
    public void  updateMarker_3()
    {
        ImageView ex = (ImageView) view.findViewById(R.id.ex);
        ex.setVisibility(View.INVISIBLE);
        ImageView glow = (ImageView) view.findViewById(R.id.glow);
        glow.setVisibility(View.INVISIBLE);
    }
    public void startGame(int vertex_id)
    {
        ImageView translucent = (ImageView) view.findViewById(R.id.translucentlayer);
        translucent.setVisibility(View.INVISIBLE);
        ImageView drawing= (ImageView)view.findViewById(R.id.drawing);
        drawing.setVisibility(View.INVISIBLE);
        //move marker to vertex 0
        ImageView v0 = ((ImageView) view.findViewById(vertex_id));
        int[] loc0 = new int[2];
        int[] canvasLocation = new int[2];
        view.getLocationInWindow(canvasLocation);
        ImageView ex = (ImageView) view.findViewById(R.id.ex);
        ex.setVisibility(View.VISIBLE);
        v0.getLocationInWindow(loc0);
        loc0[0] -= canvasLocation[0]+50 ;
        loc0[1] -= canvasLocation[1]+50 ;
        ex.setX(loc0[0]);
        ex.setY(loc0[1]);

        int h=ex.getHeight()/2;
        int w=ex.getWidth()/2;
        ImageView glow = (ImageView) view.findViewById(R.id.glow);
        glow.setVisibility(View.VISIBLE);
        glow.setX(loc0[0]-w);
        glow.setY(loc0[1]-h);

        glowanimation(glow);
    }
    public void timer()
    {
        Typeface tf = Typeface.createFromAsset(getActivity().getAssets(), "fonts/nova1.ttf");

        final TextView text = (TextView) view.findViewById(R.id.timer);
        int mTimerColor = Color.rgb(255, 255, 255);
        text.setTextColor(mTimerColor);
        text.setTextSize(20.0f);
        text.setTextAlignment(View.TEXT_ALIGNMENT_TEXT_END);
        text.setTypeface(tf);

        new CountDownTimer(90000, 1000) {
            public void onTick(long millisUntilFinished) {
                long time = millisUntilFinished / 1000;
                //if (time == 1)
                //text.setText("GO!");
                //else
                text.setText(Long.toString(time - 1)+" secs left");
            }
            public void onFinish() {
                text.setText("Quicker!");
            }
        }.start();

    }
    public void stopGame(int drawingResId)
    {
        ImageView ex = (ImageView) view.findViewById(R.id.ex);
        ex.setVisibility(View.INVISIBLE);
        ImageView drawing= (ImageView)view.findViewById(R.id.drawing);
        drawing.setImageResource(drawingResId);
        drawing.setVisibility(View.VISIBLE);

        ObjectAnimator blink_drawing = ObjectAnimator.ofFloat(drawing, "alpha", 0.0f, 1.0f);
        blink_drawing.setDuration(3000);
        blink_drawing.start();

        ObjectAnimator rotate_drawing = ObjectAnimator.ofFloat(drawing, "rotationX", 90.0f, 0.0f);
        rotate_drawing.setDuration(3000);
        rotate_drawing.start();

        drawing.setZ(1.0f);

        ImageView translucent = (ImageView) view.findViewById(R.id.translucentlayer);
        translucent.setVisibility(View.VISIBLE);

        TextView text = (TextView) view.findViewById(R.id.aggregate_text);
        Typeface tf = Typeface.createFromAsset(getActivity().getAssets(), "fonts/nova2.ttf");
        text.setZ(1.0f);
        text.setTypeface(tf);
        text.setTextSize(30);
        text.setTextColor(Color.WHITE);
        text.setBackgroundColor(getResources().getColor(R.color.green));
        text.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        text.setText("      Hurray! Game Over!");

        //send id to leaderboard

        String type = "connectthedotsleaderboard";
        BackgroundWorker backgroundWorker = new BackgroundWorker();
        backgroundWorker.execute(type);

    }
    public void glowanimation(ImageView glow)
    {
        ObjectAnimator scaleGlow_x= ObjectAnimator.ofFloat(glow, "scaleX", 0.75f, 0.25f);
        ObjectAnimator scaleGlow_y= ObjectAnimator.ofFloat(glow, "scaleY", 0.75f, 0.25f);
        scaleGlow_x.setDuration(1000);
        scaleGlow_y.setDuration(1000);
        scaleGlow_x.setRepeatCount(1000);
        scaleGlow_y.setRepeatCount(1000);
        AnimatorSet scale= new AnimatorSet();
        scale.play(scaleGlow_x).with(scaleGlow_y);
        scale.start();
    }
    public void plustenaimation(Vector<ImageView> plustens,Vector<ObjectAnimator> anim_plustens,int plustenId,int sectionId)
    {

        int[] location = new int[2];
        ImageView new_plusten= new ImageView(getActivity());
        new_plusten.setImageResource(plustenId);
        new_plusten.setVisibility(View.VISIBLE);
        ImageView section = (ImageView) view.findViewById(sectionId);
        section.getLocationInWindow(location);

        Random generator = new Random();
        int x = generator.nextInt(100)-70;
        int y = generator.nextInt(100)-70 ;

        new_plusten.setRotation(x*y);
        new_plusten.setX(location[0]+x);
        new_plusten.setY(location[1]+y);

        if(plustens.size()==5)
        {
            plustens.clear();
        }
        else {
            for(int j=0;j<plustens.size();j++) {
                layout.removeView(plustens.get(j));
            }
            plustens.add(new_plusten);
        }

        ObjectAnimator blink_plusten = ObjectAnimator.ofFloat(new_plusten, "alpha", 1.0f, 0.0f);
        blink_plusten.setDuration(1000);

        if(anim_plustens.size()==5)
        {
            anim_plustens.clear();
        }
        else {
            anim_plustens.add(blink_plusten);
        }

        //add animation to plusten
        for(int j=0;j<plustens.size();j++) {
            layout.addView(plustens.get(j));
            anim_plustens.get(j).start();
        }
    }
    public void plusoneanimation(int[] position,int[] offset)
    {
        final ImageView newone = new ImageView(getActivity());
        newone.setImageResource(plusoneId);
        newone.setVisibility(View.VISIBLE);
        newone.setX(position[0]-offset[0]);
        newone.setY(position[1]-offset[1]);
        layout.addView(newone);

        final ObjectAnimator anim_plusone_w = ObjectAnimator.ofFloat(newone, "y", position[1]-offset[1], position[1]-offset[1] - 500);
        anim_plusone_w.setDuration(500);
        anim_plusone_w.start();
        final ObjectAnimator blink_plusone_w = ObjectAnimator.ofFloat(newone, "alpha", 1.0f, 0.0f);
        blink_plusone_w.setDuration(500);
        blink_plusone_w.start();
        final Handler handler = new Handler();
        final Runnable task = new Runnable() {
            @Override
            public void run() {
                anim_plusone_w.cancel();
                blink_plusone_w.cancel();
                newone.setAnimation(null);
                ((ViewGroup) newone.getParent()).removeView(newone);
            }
        };
        handler.postDelayed(task,500);

    }
    public void onClick(View v) {
        if(gameState.game_on) {
            final JSONObject obj = new JSONObject();

            switch (v.getId()) {
                case R.id.treasurehunt_tutorial:
                    myVib.vibrate(50);
                    if (gameState.game_on) {
                        ImageView tut = (ImageView) view.findViewById(R.id.treasurehunt_tutorial);
                        tut.setVisibility(View.INVISIBLE);
                        timer();
                    }
                    break;
                case R.id.warmer:
                    myVib.vibrate(30);
                    try {
                        obj.put("selection", 0);
                        obj.put("method", "post");

                    } catch (JSONException e) {
                        e.printStackTrace();
                    }

                    plusoneanimation(LinesView.warmerLocation, LinesView.canvasLocation);

                    break;
                case R.id.colder:
                    myVib.vibrate(30);
                    try {
                        obj.put("selection", 1);
                        obj.put("method", "post");

                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                    plusoneanimation(LinesView.colderLocation, LinesView.canvasLocation);
                    break;
                case R.id.marker:
                    myVib.vibrate(30);
                    try {
                        obj.put("selection", 2);
                        obj.put("method", "post");

                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                    plusoneanimation(LinesView.markerLocation, LinesView.canvasLocation);
                    break;

            }
            callbackWs[0].send(obj.toString());
        }
    }
    public boolean onTouch(View v, MotionEvent event)
    {
        if(gameState.game_on) {
            switch (v.getId()) {
                case R.id.aggregate:
                    if (event.getAction() == MotionEvent.ACTION_DOWN) {

                        myVib.vibrate(30);

                        float width = v.getWidth();
                        float tx = event.getX();
                        float ty = event.getY();

                        int[] values = new int[2];
                        v.getLocationInWindow(values);


                        if (tx <= width / 3) {

                            try {
                                obj.put("selection", 0);
                                obj.put("method", "post");

                            } catch (JSONException e) {
                                e.printStackTrace();
                            }

                        } else if (tx >= width / 3 && tx <= width * 2 / 3) {

                            try {
                                obj.put("selection", 2);
                                obj.put("method", "post");

                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                        } else if (tx >= 2 * width / 3 && tx <= width) {
                            try {
                                obj.put("selection", 1);
                                obj.put("method", "post");

                            } catch (JSONException e) {
                                e.printStackTrace();
                            }

                        }

                        callbackWs[0].send(obj.toString());

                        int[] clickpos = new int[2];
                        clickpos[0] = (int) tx + 2 * (values[0]);
                        clickpos[1] = (int) ty + 2 * (values[1]);

                        plusoneanimation(clickpos, values);

                    }
                    break;
            }
        }
        return true;
    }

    public class websocketHandler implements AsyncHttpClient.WebSocketConnectCallback, WebSocket.StringCallback {

        public void onCompleted(Exception e, WebSocket webSocket) {
            if (e != null) {
                e.printStackTrace();
                return;
            }
            callbackException[0] = e;
            callbackWs[0] = webSocket;

            JSONObject o = new JSONObject();
            try {
                o.put("method", "getstate");
            } catch (JSONException e1) {
                e1.printStackTrace();
            }
            Log.d("tstate", "Asking server for state");
            webSocket.send(o.toString());
            webSocket.setStringCallback(this);
        }

        public void onStringAvailable(String s) {

            if (s != null) {
                if (s.contains("state")) {
                    Log.d("tstate", "Recieved state from server");
                    try {
                        JSONObject jsonObject = new JSONObject(s);
                        processState(jsonObject);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }

                }
                else if(s.equals("plus10warmer"))
                {
                    final Vector<ImageView> plustens = new Vector<ImageView>(5);
                    final Vector<ObjectAnimator> anim_plustens= new Vector<ObjectAnimator>(5);

                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            plustenaimation(plustens,anim_plustens,plustenWarmerId,R.id.warmerSection);

                        }
                    });
                }
                else if(s.equals("plus10colder"))
                {

                    final Vector<ImageView> plustens = new Vector<ImageView>(5);
                    final Vector<ObjectAnimator> anim_plustens= new Vector<ObjectAnimator>(5);

                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {

                            plustenaimation(plustens,anim_plustens,plustenColderId,R.id.colderSection);
                        }
                    });

                }
                else if(s.equals("plus10marker"))
                {

                    final Vector<ImageView> plustens = new Vector<ImageView>(5);
                    final Vector<ObjectAnimator> anim_plustens= new Vector<ObjectAnimator>(5);

                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {

                            plustenaimation(plustens,anim_plustens,plustenMarkerId,R.id.markerSection);
                        }
                    });

                }

                else if (s.equals("flag1wrong")||s.equals("flag2wrong")||s.equals("flag3wrong"))
                {
                    Log.d("wrong","wrong");
                }
                else {

                    //section aggregate text display logic

                    if (gameState.game_on) {

                        final int w, m, c;
                        final List<String> num = Arrays.asList(s.split(","));
                        if(num.size()!=4) {w=0;m=0;c=0;}
                        else {
                            w = Integer.valueOf(num.get(1));
                            m = Integer.valueOf(num.get(2));
                            c = Integer.valueOf(num.get(3));
                        }
                        //Log.d("wanderer", Integer.toString(w) + " " + Integer.toString(m) + " " + Integer.toString(c));
                        if(getActivity()!=null) {
                            getActivity().runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    TextView text = (TextView) view.findViewById(R.id.aggregate_text);

                                    Typeface tf = Typeface.createFromAsset(getActivity().getAssets(), "fonts/nova2.ttf");
                                    text.setTypeface(tf);
                                    text.setTextSize(30);
                                    text.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
                                    if (w > m && w > c) {
                                        text.setTextColor(Color.WHITE);
                                        text.setBackgroundColor(getResources().getColor(R.color.tertiary_dark));
                                        text.setText("   Your Section Says : WARMER!");
                                    } else if (m > w && m > c) {
                                        text.setBackgroundColor(getResources().getColor(R.color.primary));
                                        text.setText("   Your Section Says : DROP!");
                                    } else if (c > w && c > m) {
                                        text.setTextColor(Color.WHITE);
                                        text.setBackgroundColor(getResources().getColor(R.color.secondary));
                                        text.setText("   Your Section Says : COLDER!");
                                    } else {
                                        //text.setBackgroundColor(getResources().getColor(R.color.common_google_signin_btn_text_light_disabled));
                                        text.setBackgroundColor(Color.WHITE);
                                        text.setText(null);
                                    }
                                }
                            });
                        }
                    }
                } // else
            } //s!=null
        }//onstringavilable
    }
}

