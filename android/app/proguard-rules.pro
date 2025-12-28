# Capacitor
-keep public class com.getcapacitor.** { *; }
-keep public class com.getcapacitor.community.** { *; }

# Stripe
-keep class com.stripe.** { *; }
-dontwarn com.stripe.**
-keep class com.google.android.gms.** { *; }

# Android X
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-keep class android.support.** { *; }
-keep interface android.support.** { *; }

# General
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Ignore missing dependencies (Jackson/SLF4J)
-dontwarn java.beans.**
-dontwarn com.fasterxml.jackson.**
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
